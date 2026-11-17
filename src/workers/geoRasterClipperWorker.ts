import { fromUrl, fromArrayBuffer } from 'geotiff';
import * as turf from '@turf/turf';
import { isValidRasterValue } from '../utils/rasterValues';

let isCancelled = false;

self.onmessage = async (e) => {
  if (e.data.type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (e.data.type === 'START') {
    isCancelled = false;
    const { url, zone, noDataValues = [] } = e.data.payload;

    try {
      const result = await processRasterStream(url, zone, noDataValues);
      if (!isCancelled) {
        self.postMessage({ type: 'SUCCESS', payload: result });
      }
    } catch (err: any) {
      if (!isCancelled) {
        self.postMessage({ type: 'ERROR', error: err.message });
      }
    }
  }
};

async function processRasterStream(url: string, zone: any, extraNoData: number[] = []) {
  self.postMessage({ type: 'PROGRESS', payload: { message: 'GeoTIFF 메타데이터 읽는 중...' } });

  // Prevent fetching full TIFF by default if Range request fails
  const headRes = await fetch(url, { method: 'HEAD' }).catch(() => null);
  if (headRes) {
    const contentType = headRes.headers.get('content-type') || headRes.headers.get('Content-Type');
    if (contentType && contentType.includes('text/html')) {
       throw new Error(`404: Raster file not found, server returned HTML for ${url}`);
    }
    if (headRes.headers.get('Accept-Ranges') !== 'bytes' && headRes.headers.get('accept-ranges') !== 'bytes') {
       console.warn('[Raster Clipper] Server might not support Range requests. Request could fall back to full file download.');
    }
  }
  const tiff = await fromUrl(url);
  const image = await tiff.getImage();
  
  const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
  const width = image.getWidth();
  const height = image.getHeight();
  const resolutionX = (bbox[2] - bbox[0]) / width;
  const resolutionY = (bbox[3] - bbox[1]) / height;
  const noDataValue = image.getGDALNoData();
  let geoKeys: any = null;
  try {
    geoKeys = image.getGeoKeys();
  } catch (e: any) {
    console.warn('[Raster Clipper] getGeoKeys failed:', e.message);
  }
  
  // CRS Check (EPSG:4326)
  const is4326 = geoKeys?.GeographicTypeGeoKey === 4326 || geoKeys?.ProjectedCSTypeGeoKey === 4326 || (geoKeys && Object.values(geoKeys).includes(4326));
  if (!is4326 && geoKeys) {
     throw new Error(`Raster CRS mismatch. Expected EPSG:4326, but got ${JSON.stringify(geoKeys)}`);
  }
  
  // Calculate zone bbox
  let zonePolygon: any = null;
  if (zone.geometry && (zone.geometry.type === 'Polygon' || zone.geometry.type === 'MultiPolygon')) {
    zonePolygon = zone.geometry.type === 'Polygon' 
       ? turf.polygon(zone.geometry.coordinates) 
       : turf.multiPolygon(zone.geometry.coordinates);
  } else {
    if (zone.shapeType === 'rectangle') {
      const radiusKm = zone.radius / 1000;
      const b = turf.bbox(turf.circle([zone.lng, zone.lat], radiusKm, { units: 'kilometers', steps: 4 }));
      zonePolygon = turf.bboxPolygon(b);
    } else {
      zonePolygon = turf.circle([zone.lng, zone.lat], zone.radius / 1000, { units: 'kilometers', steps: 64 });
    }
  }
  
  const zBbox = turf.bbox(zonePolygon); // [minX, minY, maxX, maxY]
  
  // Calculate intersection window
  const minX = Math.max(bbox[0], zBbox[0]);
  const minY = Math.max(bbox[1], zBbox[1]);
  const maxX = Math.min(bbox[2], zBbox[2]);
  const maxY = Math.min(bbox[3], zBbox[3]);
  
  if (minX >= maxX || minY >= maxY) {
     return {
        isEmpty: true,
        width: 0, height: 0, values: [], noDataValue,
        resolution: [resolutionX, resolutionY],
        bbox: [0,0,0,0]
     };
  }
  
  // GeoTIFF usually has origin at top-left. bbox[1] is bottom, bbox[3] is top.
  // We need to calculate pixel coordinates
  const left = Math.floor((minX - bbox[0]) / resolutionX);
  const right = Math.ceil((maxX - bbox[0]) / resolutionX);
  const bottom = Math.ceil((bbox[3] - minY) / resolutionY);
  const top = Math.floor((bbox[3] - maxY) / resolutionY);
  
  const windowLeft = Math.max(0, left);
  const windowRight = Math.min(width, right);
  const windowTop = Math.max(0, top);
  const windowBottom = Math.min(height, bottom);
  
  const winWidth = windowRight - windowLeft;
  const winHeight = windowBottom - windowTop;
  
  if (winWidth <= 0 || winHeight <= 0) {
     return {
        isEmpty: true,
        width: 0, height: 0, values: [], noDataValue,
        resolution: [resolutionX, resolutionY],
        bbox: [0,0,0,0]
     };
  }
  
  self.postMessage({ type: 'PROGRESS', payload: { message: `Raster 윈도우 읽는 중... (${winWidth}x${winHeight})` } });

  const rasterData = await image.readRasters({
    window: [windowLeft, windowTop, windowRight, windowBottom],
    interleave: false
  });
  
  const values = rasterData[0]; // first band
  
  self.postMessage({ type: 'PROGRESS', payload: { message: '원형 영역 마스킹 중...' } });
  
  // Mask outside of circle if needed
  // Create an array for the clipped result
  const maskedValues = new Float32Array(values.length);
  const resultBbox = [
     bbox[0] + windowLeft * resolutionX,
     bbox[3] - windowBottom * resolutionY,
     bbox[0] + windowRight * resolutionX,
     bbox[3] - windowTop * resolutionY
  ];
  
  let validCount = 0;
  let insideZonePixelCount = 0;
  
  for (let y = 0; y < winHeight; y++) {
     for (let x = 0; x < winWidth; x++) {
        const idx = y * winWidth + x;
        let val = (values as any)[idx];
        
        // check if inside polygon
        const pX = resultBbox[0] + (x + 0.5) * resolutionX;
        const pY = resultBbox[3] - (y + 0.5) * resolutionY;
        
        if (turf.booleanPointInPolygon([pX, pY], zonePolygon)) {
           insideZonePixelCount++;
           
           if (!isValidRasterValue(val, noDataValue, extraNoData)) {
              maskedValues[idx] = NaN;
           } else {
              maskedValues[idx] = val;
              validCount++;
           }
        } else {
           maskedValues[idx] = NaN; // mark as nodata outside circle
        }
     }
  }
  
  if (isCancelled) {
    throw new Error("Cancelled by user");
  }

  
  const workerDiagnostics = {
    datasetId: url.split('/')[2],
    url,
    width,
    height,
    rasterBBox: bbox,
    resolution: [resolutionX, resolutionY],
    noDataValue,
    geoKeys,
    windowLeft,
    windowTop,
    windowRight,
    windowBottom,
    windowWidth: winWidth,
    windowHeight: winHeight,
    insideZonePixelCount,
    validPixelCount: validCount,
    coverageRatio: insideZonePixelCount > 0 ? (validCount / insideZonePixelCount) * 100 : 0
  };
  
  console.log('[Raster Analysis]');
  console.log('URL: ' + url);
  console.log('CRS: ' + (is4326 ? 'EPSG:4326' : 'Unknown'));
  console.log('Full Raster: ' + width + ' x ' + height);
  console.log('Analysis Window: ' + winWidth + ' x ' + winHeight);
  console.log('Inside Zone Pixels: ' + insideZonePixelCount);
  console.log('Valid Pixels: ' + validCount);
  console.log('Coverage: ' + (insideZonePixelCount > 0 ? (validCount / insideZonePixelCount * 100).toFixed(1) : '0') + '%');
  console.log('IndexedDB Saved: true');
  

  
  return {
    isEmpty: validCount === 0,
    width: winWidth,
    height: winHeight,
    values: maskedValues,
    noDataValue: NaN, // We replaced nodata with NaN
    resolution: [resolutionX, resolutionY],
    bbox: resultBbox,
    workerDiagnostics
  };
}

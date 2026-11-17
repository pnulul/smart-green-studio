import { JSONParser } from '@streamparser/json';
import * as turf from '@turf/turf';
import { fetchSpatialAsset } from '../services/resourceService';

// Store reference to check for cancellation
let isCancelled = false;

self.onmessage = async (e) => {
  if (e.data.type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (e.data.type === 'START') {
    isCancelled = false;
    const { url, zone } = e.data.payload;

    try {
      const result = await processStream(url, zone);
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

async function processStream(url: string, zone: any) {
  // Create zone polygon and bbox
  let zonePolygon: any = null;
  if (zone.geometry && (zone.geometry.type === 'Polygon' || zone.geometry.type === 'MultiPolygon')) {
    zonePolygon = zone.geometry.type === 'Polygon' 
       ? turf.polygon(zone.geometry.coordinates) 
       : turf.multiPolygon(zone.geometry.coordinates);
  } else {
    if (zone.shapeType === 'rectangle') {
      const radiusKm = zone.radius / 1000;
      const bbox = turf.bbox(turf.circle([zone.lng, zone.lat], radiusKm, { units: 'kilometers', steps: 4 }));
      zonePolygon = turf.bboxPolygon(bbox);
    } else {
      zonePolygon = turf.circle([zone.lng, zone.lat], zone.radius / 1000, { units: 'kilometers', steps: 64 });
    }
  }
  
  const zoneBbox = turf.bbox(zonePolygon);

  // Start fetch
  const response = await fetchSpatialAsset(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  let readBytes = 0;

  const parser = new JSONParser({ paths: ['$.features.*'], keepStack: false });
  const clippedFeatures: any[] = [];
  
  let featuresProcessed = 0;
  
  // This will temporarily block the stream read if we need to yield, but parser is sync.
  // We can just process synchronously since we are in a worker.
  parser.onValue = ({ value, key, parent, stack }) => {
    {
      const feature = value as any;
      featuresProcessed++;
      
      // Cleanup parent to prevent OOM
      if (parent) {
        delete parent[key];
      }
      
      if (!feature?.geometry) return;
      
      // 1. Fast BBox check
      let featBbox: number[];
      try { featBbox = turf.bbox(feature); } catch { return; }
      const intersectsBbox = (
        featBbox[0] <= zoneBbox[2] &&
        featBbox[2] >= zoneBbox[0] &&
        featBbox[1] <= zoneBbox[3] &&
        featBbox[3] >= zoneBbox[1]
      );
      
      if (intersectsBbox) {
        // 2. Precise turf clip
        try {
          const geomType = feature.geometry.type;
          if (turf.booleanIntersects(feature, zonePolygon)) {
            if (geomType === 'Point') {
              if (turf.booleanPointInPolygon(feature, zonePolygon)) {
                clippedFeatures.push(feature);
              }
            } else if (geomType === 'MultiPoint') {
              const coordinates = feature.geometry.coordinates.filter((p: number[]) => turf.booleanPointInPolygon(turf.point(p), zonePolygon));
              if (coordinates.length) clippedFeatures.push(turf.multiPoint(coordinates, feature.properties));
            } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
              turf.flattenEach(feature, (line) => {
                const split = turf.lineSplit(line as any, zonePolygon);
                const parts = split.features.length ? split.features : [line];
                for (const part of parts) {
                  const midpoint = turf.along(part as any, turf.length(part as any) / 2);
                  if (turf.booleanPointInPolygon(midpoint, zonePolygon)) {
                    part.properties = { ...feature.properties };
                    clippedFeatures.push(part);
                  }
                }
              });
            } else {
              const intersection = turf.intersect(turf.featureCollection([feature, zonePolygon]));
              if (intersection) {
                intersection.properties = { ...feature.properties };
                clippedFeatures.push(intersection);
              }
            }
          }
        } catch(e) {
          // ignore geometry errors
        }
      }
      
    }
  };

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No readable stream");

  let lastProgressTime = Date.now();

  while (!isCancelled) {
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }
    
    readBytes += value.length;
    parser.write(value);
    
    // Periodically post progress and yield to allow cancel messages to be processed
    const now = Date.now();
    if (now - lastProgressTime > 200) { // Every 200ms
      self.postMessage({ 
        type: 'PROGRESS', 
        payload: { 
          readBytes, 
          totalBytes, 
          featuresProcessed 
        } 
      });
      lastProgressTime = now;
      // Yield to event loop
      await new Promise(r => setTimeout(r, 0));
    }
  }

  if (isCancelled) {
    throw new Error("Cancelled by user");
  }

  // Complete documents auto-end in @streamparser/json. A second end() throws.
  if (!parser.isEnded) parser.end();

  return {
    geoJson: { type: 'FeatureCollection', features: clippedFeatures },
    featureCount: featuresProcessed
  };
}

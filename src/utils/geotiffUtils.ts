import { writeArrayBuffer } from 'geotiff';

export async function generateGeoTiffBlob(datasetId: string, rasterResult: any): Promise<Blob> {
  const width = rasterResult.width;
  const height = rasterResult.height;
  const bbox = rasterResult.bbox; // [minX, minY, maxX, maxY]
  let noDataValue = rasterResult.noDataValue;

  let outValues: any;
  let gdalNoDataStr = '';

  const isCategory = ['24_landcover_major', '25_ecology'].includes(datasetId);

  if (isCategory) {
    outValues = new Uint8Array(width * height);
    noDataValue = 255;
    gdalNoDataStr = '255';
    for (let i = 0; i < rasterResult.values.length; i++) {
      let val = rasterResult.values[i];
      if (Number.isNaN(val) || val === rasterResult.noDataValue) {
        outValues[i] = 255;
      } else {
        outValues[i] = Math.round(val);
      }
    }
  } else {
    outValues = new Float32Array(width * height);
    noDataValue = -9999;
    gdalNoDataStr = '-9999';
    for (let i = 0; i < rasterResult.values.length; i++) {
      let val = rasterResult.values[i];
      if (Number.isNaN(val) || val === rasterResult.noDataValue) {
        outValues[i] = -9999;
      } else {
        outValues[i] = val;
      }
    }
  }

  const minX = bbox[0];
  const maxY = bbox[3];
  
  // resolution[0] is pixel width, resolution[1] is pixel height (usually negative or positive, but we set scale to positive)
  const pixelWidth = (bbox[2] - bbox[0]) / width;
  const pixelHeight = (bbox[3] - bbox[1]) / height;

  const metadata = {
    width,
    height,
    GeographicTypeGeoKey: 4326,
    ModelPixelScale: [pixelWidth, pixelHeight, 0],
    ModelTiepoint: [0, 0, 0, minX, maxY, 0],
    GDAL_NODATA: gdalNoDataStr
  };

  const arrayBuffer = await writeArrayBuffer(outValues, metadata);
  return new Blob([arrayBuffer], { type: 'image/tiff' });
}

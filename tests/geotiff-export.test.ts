import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromArrayBuffer } from 'geotiff';
import { generateGeoTiffBlob } from '../src/utils/geotiffUtils';

test('exported continuous GeoTIFF preserves fractional and negative values, NoData and coordinates', async () => {
  const blob = await generateGeoTiffBlob('17_lst', { width: 3, height: 1, values: new Float32Array([-2.5, 41.75, NaN]), noDataValue: NaN, bbox: [129, 35, 129.03, 35.01] });
  const image = await (await fromArrayBuffer(await blob.arrayBuffer())).getImage();
  assert.equal(image.getWidth(), 3); assert.equal(image.getHeight(), 1);
  const values = (await image.readRasters())[0];
  assert.deepEqual(Array.from(values), [-2.5, 41.75, -9999]);
  assert.equal(image.getGDALNoData(), -9999);
  assert.equal(image.getGeoKeys()?.GeographicTypeGeoKey, 4326);
});

test('categorical GeoTIFF preserves class codes and masks missing pixels', async () => {
  const blob = await generateGeoTiffBlob('25_ecology', { width: 3, height: 1, values: new Float32Array([1, 3, NaN]), noDataValue: NaN, bbox: [129, 35, 129.03, 35.01] });
  const image = await (await fromArrayBuffer(await blob.arrayBuffer())).getImage();
  assert.deepEqual(Array.from((await image.readRasters())[0]), [1, 3, 255]);
  assert.equal(image.getGDALNoData(), 255);
});

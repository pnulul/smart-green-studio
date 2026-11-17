import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidRasterValue } from '../src/utils/rasterValues';

test('LST excludes exactly zero while preserving negative temperatures', () => {
  assert.equal(isValidRasterValue(0, null, [0]), false);
  assert.equal(isValidRasterValue(-3.5, null, [0]), true);
  assert.equal(isValidRasterValue(35, null, [0]), true);
});
test('population and flat slope can contain real zero values; declared NoData and non-finite values are excluded', () => {
  assert.equal(isValidRasterValue(0, null), true);
  assert.equal(isValidRasterValue(-9999, -9999), false);
  assert.equal(isValidRasterValue(NaN, null), false);
  assert.equal(isValidRasterValue(Infinity, null), false);
});

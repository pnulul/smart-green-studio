import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { buildSync } from 'esbuild';

const endpoint = 'https://script.google.com/macros/s/sample/exec';
const script = buildSync({
  entryPoints: ['src/services/usageTelemetry.ts'], bundle: true, write: false, format: 'cjs',
  define: { 'import.meta.env.VITE_USAGE_ENDPOINT': JSON.stringify(endpoint) },
}).outputFiles[0].text;

function storage() {
  const items = new Map<string, string>();
  return { getItem: (k: string) => items.get(k) || null, setItem: (k: string, v: string) => items.set(k,v), removeItem: (k: string) => items.delete(k) };
}

test('public telemetry needs an explicit location request, coarsens before queuing and respects opt-out', async () => {
  const session = storage();
  const clientWindow = new EventTarget();
  const sent: any[] = [];
  let locationCallback: ((position: object) => void) | undefined;
  const context = vm.createContext({
    module: { exports: {} }, crypto: webcrypto, window: clientWindow, document: new EventTarget(),
    sessionStorage: session, localStorage: storage(), setTimeout: () => 1, clearTimeout() {}, AbortController,
    navigator: { geolocation: { getCurrentPosition(cb: (p: object) => void) { locationCallback = cb; } } },
    fetch: async (_url: string, init: RequestInit) => {
      assert.equal(init.credentials, 'omit');
      sent.push(...JSON.parse(String(init.body)).events);
      return { ok: true, json: async () => ({ ok: true }) };
    },
  });
  vm.runInContext(script, context);
  const client = context.module.exports;
  client.setUsageScreen('entry');
  client.setUsageScreen('entry');
  assert.equal(locationCallback, undefined);
  client.requestLocationSharing();
  const givePosition = () => locationCallback!({ coords: { latitude: 35.197654, longitude: 129.208427 } });
  givePosition();
  const prior = session.getItem('sgs_public_usage_queue_v1')!;
  assert.equal(JSON.parse(prior).length, 2);
  assert.ok(!prior.includes('35.197654'));
  assert.ok(!prior.includes('129.208427'));
  client.stopLocationSharing();
  clientWindow.dispatchEvent(new Event('online'));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(sent.map(e => [e.a,e.p,e.x,e.y]), [
    ['visit','unshared',undefined,undefined], ['location','shared',352,1292], ['location','unshared',undefined,undefined],
  ]);
  assert.equal(new Set(sent.map(e => e.v)).size, 1);
  assert.equal(session.getItem('sgs_public_usage_queue_v1'), null);
  client.requestLocationSharing();
  client.setUsageEnabled(false);
  givePosition();
  client.setUsageScreen('analysis');
  assert.equal(client.getUsagePreference().location, 'unshared');
  assert.equal(session.getItem('sgs_public_usage_queue_v1'), null);
});

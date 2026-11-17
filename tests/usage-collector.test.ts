import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { renderCollector } from '../scripts/build-usage-collector.mjs';

const visit = 'vc68e42cabf2122a4';
const sample = () => ({ v: visit, n: 1, t: Date.now(), s: 'entry', a: 'visit', p: 'unshared' });

async function fixture() {
  const stored: any[][] = [];
  let locked = false;
  let capacity = 1;
  const sheet = {
    getLastRow: () => stored.length + 1,
    getMaxRows: () => capacity,
    insertRowsAfter: (_end: number, count: number) => { capacity += count; },
    getRange(first: number | string, col?: number) {
      if (first === 'K1') return { getValue: () => '기록 ID' };
      if (col === 11) return {
        createTextFinder(pattern: string) {
          const finder = {
            useRegularExpression() { return finder; }, matchEntireCell() { return finder; },
            findAll: () => stored.filter(r => RegExp(pattern).test(r[10])).map(r => ({ getValue: () => r[10] })),
          };
          return finder;
        },
      };
      return { setValues(rows: any[][]) { assert.ok(locked); stored.push(...rows); } };
    },
  };
  const content = { MimeType: { JSON: 'json' }, createTextOutput: (s: string) => ({ setMimeType: () => s }) };
  const context = vm.createContext({
    ContentService: content,
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() {} },
    LockService: { getScriptLock: () => ({
      tryLock() { if (locked) return false; locked = true; return true; },
      releaseLock() { locked = false; },
    }) },
  });
  vm.runInContext(await renderCollector('test_sheet_id_for_usage_log'), context);
  const post = (events: object[]) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ version: 1, events }) } }));
  return { stored, post, health: () => JSON.parse(context.doGet()) };
}

test('collector writes named controls once across repeat deliveries and concurrent visits', async () => {
  const { stored, post, health } = await fixture();
  const first = sample(), click = { ...first, n: 2, s: 'setup', a: 'radius-step-btn-500' };
  assert.deepEqual(post([first, click, click]), { ok: true });
  assert.deepEqual(post([first, click]), { ok: true });
  assert.deepEqual(post([{ ...click, v: 'v000000000000ffff' }]), { ok: true });
  assert.equal(stored.length, 3);
  assert.equal(stored[1][4], '대상지 설정');
  assert.equal(stored[1][5], '분석 반경 500m');
  assert.deepEqual([stored[1][7], stored[1][8]], ['', '']);
  assert.deepEqual(health(), { service: 'Smart Green Studio usage', version: 1 });
});

test('collector accepts coarse signed coordinates only after location sharing and rejects free-form data', async () => {
  const { stored, post } = await fixture();
  const e = { ...sample(), a: 'location', p: 'shared', x: -331, y: 0 };
  assert.deepEqual(post([e]), { ok: true });
  assert.deepEqual([stored[0][7], stored[0][8]], [-33.1, 0]);
  for (const fields of [{ p: 'denied' },{ x: 351.2345 },{ y: 1801 },{ a: '=PRIVATE()' },{ a: 'constructor' },{ s: 'unknown' },{ v: 'person@example.com' }]) {
    assert.deepEqual(post([{ ...e, ...fields }]), { error: 'invalid' });
  }
  assert.equal(stored.length, 1);
});

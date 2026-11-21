import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildSync } from 'esbuild';

const script = buildSync({ entryPoints: ['src/services/googleSearchService.ts'], bundle: true, write: false, format: 'cjs', define: { 'import.meta.env.VITE_NEWS_SEARCH_URL': JSON.stringify('https://news.example/api/news/search') } }).outputFiles[0].text;

function client(fetcher: typeof fetch) {
  const context = vm.createContext({ module: { exports: {} }, URL, AbortSignal, fetch: fetcher });
  vm.runInContext(script, context);
  return context.module.exports.googleSearchService;
}

test('configured news search works without personal keys, encodes Korean queries and caches repeated searches', async () => {
  let count = 0;
  const service = client(async input => {
    count++;
    assert.equal(new URL(String(input)).searchParams.get('q'), '부산 공원 & 녹지');
    return Response.json({ provider: 'NewsData.io', items: [{ title: '실제 기사', link: 'https://news.example/article', snippet: '공원 조성' }] });
  });
  assert.equal(service.isConfigured(), true);
  const items = await service.searchNews('부산 공원 & 녹지');
  assert.equal(items.length, 1);
  assert.equal(items[0].provider, 'NewsData.io');
  await service.searchNews('부산 공원 & 녹지');
  assert.equal(count, 1);
});

test('empty news results stay empty and unsafe article links are excluded', async () => {
  const empty = client(async () => Response.json({ items: [] }));
  assert.equal((await empty.searchNews('없는검색어')).length, 0);
  const unsafe = client(async () => Response.json({ items: [{ title: 'unsafe', link: 'javascript:alert(1)' }] }));
  assert.equal((await unsafe.searchNews('부산')).length, 0);
});

test('news upstream failures and malformed responses are reported as errors', async () => {
  const failed = client(async () => Response.json({ error: '뉴스 연결 실패' }, { status: 502 }));
  await assert.rejects(failed.searchNews('부산'), /뉴스 연결 실패/);
  const invalid = client(async () => Response.json({ unexpected: true }));
  await assert.rejects(invalid.searchNews('부산'), /응답/);
});

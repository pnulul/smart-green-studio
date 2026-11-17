import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { createApplication, type ServerConfig } from '../server/app';

async function fixture(generateAnswer?: (q: string, c: unknown, h: any[]) => Promise<string>) {
  const directory = await mkdtemp(join(tmpdir(), 'sgs-test-'));
  const config: ServerConfig = { allowedIds: ['12345'], passcode: 'test-only-pass', sessionSecret: 'test-only-session-secret', allowDemo: true, logsDir: directory, apiKey: '', model: 'test-model', allowedOrigins: [] };
  const app = await createApplication({ production: true, staticDir: resolve('dist'), config, generateAnswer });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(r => server.once('listening', r));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const request = (route: string, body?: unknown, cookie?: string, origin?: string) => fetch(base + route, {
    method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const login = () => request('/api/auth/login', { studentId: '12345', studentName: '검증 사용자', password: 'test-only-pass', courseCode: 'PNU-LA301' });
  return { request, login, directory, close: async () => {
    await new Promise<void>((r, j) => server.close(e => e ? j(e) : r()));
    // Only remove the unique temporary directory made by this fixture.
    if (!relative(tmpdir(), directory).startsWith('sgs-test-')) throw new Error('Unsafe temporary directory');
    await rm(directory, { recursive: true, force: true });
  } };
}

test('public demo configuration never discloses class credentials; authentication uses a signed cookie', async () => {
  const f = await fixture();
  try {
    const config = await (await f.request('/api/auth/config')).json();
    assert.deepEqual(config, { courseLogin: true, demo: true });
    assert.equal((await f.request('/api/auth/login', { studentId: '12345', studentName: '검증', password: 'wrong', courseCode: 'PNU-LA301' })).status, 401);
    const response = await f.login();
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
    assert.equal((await response.json()).studentName, '검증 사용자');
    assert.equal((await f.request('/api/auth/session', undefined, cookie.split(';')[0])).status, 200);
    assert.equal((await f.request('/api/auth/session', undefined, cookie.split(';')[0] + 'tampered')).status, 401);
    assert.equal((await f.request('/api/auth/session', undefined, undefined, 'https://untrusted.example')).status, 403);
  } finally { await f.close(); }
});

test('class logs cannot be written anonymously or attributed to another student', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.request('/api/log', { action: 'TEST' })).status, 401);
    const cookie = (await f.login()).headers.get('set-cookie')!.split(';')[0];
    assert.equal((await f.request('/api/log', { student_id: '../../wrong', action: 'TEST', details: '=FORMULA(),"quoted"' }, cookie)).status, 200);
    const csv = await readFile(join(f.directory, 'students', '12345.csv'), 'utf8');
    assert.ok(csv.includes('12345')); assert.ok(!csv.includes('../../wrong'));
    assert.ok(csv.includes("'=FORMULA()")); assert.ok(csv.includes('""quoted""'));
  } finally { await f.close(); }
});

test('AI explicitly reports missing credentials and rejects anonymous requests', async () => {
  const f = await fixture();
  try {
    const body = { question: '결과 해석', context: { analyses: {} } };
    assert.equal((await f.request('/api/ai/chat', body)).status, 401);
    const cookie = (await f.login()).headers.get('set-cookie')!.split(';')[0];
    assert.equal((await f.request('/api/ai/chat', body, cookie)).status, 503);
    assert.equal((await (await f.request('/api/ai/status', undefined, cookie)).json()).configured, false);
  } finally { await f.close(); }
});

test('AI route forwards real supplied analysis context and returns the generator response', async () => {
  const context = { site: { siteName: '테스트 대상지' }, analyses: { elevation: { kpis: [{ value: 12 }] } } };
  const f = await fixture(async (question, evidence, history) => {
    assert.equal(question, '표고는?'); assert.deepEqual(evidence, context); assert.equal(history.length, 8);
    return '주입한 테스트 생성기의 응답';
  });
  try {
    const cookie = (await f.login()).headers.get('set-cookie')!.split(';')[0];
    const response = await f.request('/api/ai/chat', { question: '표고는?', context, history: Array.from({ length: 20 }, () => ({ role: 'user', content: '이전 질문' })) }, cookie);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).answer, '주입한 테스트 생성기의 응답');
  } finally { await f.close(); }
});

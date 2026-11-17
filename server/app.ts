import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { PNU_COURSES } from '../src/config/courses';
import { AI_SYSTEM_INSTRUCTION, DEFAULT_GEMINI_MODEL, aiPrompt } from '../src/config/ai';

type Session = { studentId: string; studentName: string; courseName: string; courseCode: string; authTime: string; isLoggedIn: boolean; expiresAt: number };
export type ServerConfig = {
  allowedIds: string[]; passcode: string; sessionSecret: string; allowDemo: boolean;
  logsDir: string; apiKey: string; model: string; allowedOrigins: string[];
};
type Generator = (question: string, context: unknown, history: any[]) => Promise<string>;

export function environmentConfig(): ServerConfig {
  return {
    allowedIds: (process.env.SGS_ALLOWED_STUDENT_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
    passcode: process.env.SGS_COURSE_PASSCODE || '',
    sessionSecret: process.env.SGS_SESSION_SECRET || randomBytes(32).toString('hex'),
    allowDemo: process.env.SGS_ALLOW_DEMO !== 'false',
    logsDir: path.resolve(process.env.SGS_LOGS_DIR || 'data/logs'),
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    allowedOrigins: (process.env.SGS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  };
}
const equal = (a: string, b: string) => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
const csv = (value: unknown) => {
  let s = value === undefined || value === null ? '' : String(value);
  if (/^[=+@\-]/.test(s)) s = `'${s}`;
  return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const LOG_FIELDS = ['timestamp', 'student_id', 'session_id', 'action', 'stage', 'dataset_id', 'dataset_name', 'site_name', 'latitude', 'longitude', 'buffer_shape', 'buffer_size', 'status', 'duration_ms', 'details'];

export async function createApplication(options: { production?: boolean; staticDir?: string; config?: ServerConfig; generateAnswer?: Generator } = {}) {
  const config = options.config || environmentConfig();
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    const ownOrigin = `${req.protocol}://${req.get('host')}`;
    if (origin && origin !== ownOrigin) {
      if (!config.allowedOrigins.includes(origin)) return res.status(403).json({ error: '허용되지 않은 접속 주소입니다.' });
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  const sign = (body: string) => createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  const readSession = (req: express.Request): Session | null => {
    try {
      const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('sgs_session='))?.slice(12);
      if (!cookie) return null;
      const [body, signature] = cookie.split('.');
      if (!body || !signature || !equal(sign(body), signature)) return null;
      const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session;
      return session.expiresAt > Date.now() && config.allowedIds.includes(session.studentId) ? session : null;
    } catch { return null; }
  };
  const limits = new Map<string, { count: number; reset: number }>();
  const limited = (kind: string, key: string, max: number) => {
    const id = `${kind}:${key}`, now = Date.now();
    const current = limits.get(id);
    if (!current || current.reset < now) { limits.set(id, { count: 1, reset: now + 60_000 }); return false; }
    current.count++;
    if (limits.size > 2000) for (const [k, v] of limits) if (v.reset < now) limits.delete(k);
    return current.count > max;
  };
  const cookieOptions = (req: express.Request) => `Path=/; HttpOnly; SameSite=Lax${req.secure ? '; Secure' : ''}`;

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Smart Green Studio' }));
  app.get('/api/auth/config', (_req, res) => res.json({ courseLogin: !!config.passcode && !!config.allowedIds.length, demo: config.allowDemo }));
  app.post('/api/auth/login', (req, res) => {
    if (limited('login', req.ip || 'unknown', 20)) return res.status(429).json({ error: '접속 요청이 많습니다. 잠시 후 다시 시도해주세요.' });
    const { studentId, studentName, password, courseCode, customCourseName } = req.body || {};
    if (typeof studentId !== 'string' || !/^\d{5}$/.test(studentId) || typeof studentName !== 'string' || !studentName.trim() || studentName.length > 100 || typeof password !== 'string') {
      return res.status(400).json({ error: '이름과 발급된 5자리 ID, 수업 비밀번호를 확인해주세요.' });
    }
    if (!config.passcode || !config.allowedIds.includes(studentId) || !equal(password, config.passcode)) return res.status(401).json({ error: 'ID 또는 수업 비밀번호가 올바르지 않습니다.' });
    const course = PNU_COURSES.find(c => c.code === courseCode);
    if (!course && courseCode !== 'CUSTOM') return res.status(400).json({ error: '수업을 선택해주세요.' });
    const session: Session = { studentId, studentName: studentName.trim(), courseCode,
      courseName: course?.name || String(customCourseName || '외부 세미나').slice(0, 100),
      isLoggedIn: true, authTime: new Date().toISOString(), expiresAt: Date.now() + 86_400_000 };
    const body = Buffer.from(JSON.stringify(session)).toString('base64url');
    res.setHeader('Set-Cookie', `sgs_session=${body}.${sign(body)}; Max-Age=86400; ${cookieOptions(req)}`);
    const { expiresAt, ...publicSession } = session;
    res.json(publicSession);
  });
  app.get('/api/auth/session', (req, res) => {
    const session = readSession(req);
    if (!session) return res.status(401).json({ error: '수업용 로그인이 필요합니다.' });
    const { expiresAt, ...publicSession } = session;
    res.json(publicSession);
  });
  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', `sgs_session=; Max-Age=0; ${cookieOptions(req)}`);
    res.sendStatus(204);
  });
  app.post('/api/log', (req, res) => {
    const session = readSession(req);
    if (!session) return res.status(401).json({ error: '수업용 로그인이 필요합니다.' });
    const body = req.body || {};
    if (typeof body.action !== 'string' || body.action.length > 100 || JSON.stringify(body).length > 20_000) return res.status(400).json({ error: '기록 형식을 확인해주세요.' });
    const data = { ...body, timestamp: new Date().toISOString(), student_id: session.studentId };
    const row = LOG_FIELDS.map(field => csv(data[field])).join(',') + '\r\n';
    try {
      const studentDir = path.join(config.logsDir, 'students');
      fs.mkdirSync(studentDir, { recursive: true });
      for (const file of [path.join(config.logsDir, 'usage_all.csv'), path.join(studentDir, `${session.studentId}.csv`)]) {
        if (!fs.existsSync(file)) fs.writeFileSync(file, '\uFEFF' + LOG_FIELDS.join(',') + '\r\n');
        fs.appendFileSync(file, row, 'utf8');
      }
      res.json({ success: true });
    } catch { res.status(500).json({ error: '사용기록을 저장할 수 없습니다.' }); }
  });
  app.get('/api/ai/status', (req, res) => res.json({ configured: !!config.apiKey && !!readSession(req), model: config.model }));
  app.post('/api/ai/chat', async (req, res) => {
    const session = readSession(req);
    if (!session) return res.status(401).json({ error: '수업용 로그인 또는 개인 Gemini API 키가 필요합니다.' });
    if (limited('ai', session.studentId, 10)) return res.status(429).json({ error: '질문 요청이 많습니다. 잠시 후 다시 시도해주세요.' });
    const { question, context, history = [] } = req.body || {};
    if (typeof question !== 'string' || !question.trim() || question.length > 4000 || !context || typeof context !== 'object' || JSON.stringify(context).length > 100_000 || !Array.isArray(history)) return res.status(400).json({ error: '질문과 대상지 분석자료 형식을 확인해주세요.' });
    if (!config.apiKey && !options.generateAnswer) return res.status(503).json({ error: '교수자 설정에서 Gemini API 키를 연결해주세요.' });
    try {
      const safeHistory = history.slice(-8).filter(m => (m?.role === 'user' || m?.role === 'ai') && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
      let answer: string;
      if (options.generateAnswer) answer = await options.generateAnswer(question, context, safeHistory);
      else {
        const client = new GoogleGenAI({ apiKey: config.apiKey, httpOptions: { timeout: 60_000 } });
        const result = await client.models.generateContent({ model: config.model, contents: aiPrompt(question, context, safeHistory), config: { systemInstruction: AI_SYSTEM_INSTRUCTION, maxOutputTokens: 3000 } });
        answer = result.text || '';
      }
      if (!answer.trim()) throw new Error('Empty response');
      res.json({ answer, model: config.model });
    } catch { res.status(502).json({ error: 'AI 응답을 받지 못했습니다. API 키와 모델, 사용 한도를 확인해주세요.' }); }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: '지원하지 않는 요청입니다.' }));
  if (options.production) {
    const dir = options.staticDir || path.resolve('dist');
    app.use(express.static(dir));
    app.get('*', (_req, res) => res.sendFile(path.join(dir, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status === 413 ? 413 : 400).json({ error: '요청 크기 또는 형식을 확인해주세요.' }));
  return app;
}

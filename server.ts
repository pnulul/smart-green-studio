import 'dotenv/config';
import { createApplication } from './server/app';

async function start() {
  const production = process.env.NODE_ENV === 'production' || /server\.cjs$/.test(process.argv[1] || '');
  const app = await createApplication({ production });
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => console.log(`Smart Green Studio: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`));
}
start().catch(() => { console.error('Smart Green Studio를 시작하지 못했습니다. 실행 설정을 확인해주세요.'); process.exitCode = 1; });

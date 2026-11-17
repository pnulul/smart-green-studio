import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
process.chdir(root);
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 24 LTS is required.');
const nodeDir = dirname(process.execPath);
const candidates = [
  resolve(nodeDir, '../node_modules/pnpm/bin/pnpm.mjs'),
  resolve(nodeDir, 'node_modules/pnpm/bin/pnpm.cjs'),
  resolve(process.env.APPDATA || nodeDir, 'npm/node_modules/pnpm/bin/pnpm.cjs'),
];
const pnpm = candidates.find(existsSync);
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, PATH: `${nodeDir}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH || ''}` } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
};
if (!existsSync(resolve(root, 'node_modules/.modules.yaml')) || !existsSync(resolve(root, 'dist/server.cjs'))) {
  if (!pnpm) throw new Error('Install pnpm first: npm install --global pnpm@11.25.0');
  if (!existsSync(resolve(root, 'node_modules/.modules.yaml'))) run([pnpm, 'install', '--frozen-lockfile']);
  if (!existsSync(resolve(root, 'dist/server.cjs'))) run([pnpm, 'run', 'build']);
}
const { config } = await import('dotenv');
config({ quiet: true });
const address = `http://127.0.0.1:${process.env.PORT || 3000}`;
try {
  const response = await fetch(`${address}/api/health`, { signal: AbortSignal.timeout(1000) });
  if (response.ok && (await response.json()).service === 'Smart Green Studio') {
    console.log(`Smart Green Studio is already running. Open ${address}`);
    process.exit(0);
  }
} catch { /* No existing instance; start the application below. */ }
console.log(`Open ${address} in Chrome or Edge. Keep this window open; Ctrl+C stops the server.`);
run([resolve(root, 'dist/server.cjs')]);

import './prepare-data.mjs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.SGS_BASE_PATH || (repo && !repo.endsWith('.github.io') ? `/${repo}/` : '/');
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'pages'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, SGS_BASE_PATH: base },
});
if (result.error) throw result.error;
process.exitCode = result.status || 0;

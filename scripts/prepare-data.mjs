import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, copyFile, stat, rename, rm, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'public');
const destination = join(root, '.prepared-public');
if (relative(root, destination) !== '.prepared-public') throw new Error('Unsafe generated directory');

async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink: ${entry.name}`);
    const file = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file));
    else if (entry.isFile()) result.push(file);
  }
  return result;
}

// Only this generated directory is replaced. Original data remains in public/.
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
let generated = 0;
for (const file of await walk(source)) {
  if (!file.endsWith('.geojson')) continue;
  const compressed = `${file}.gz`;
  const inputStat = await stat(file);
  const outputStat = await stat(compressed).catch(() => null);
  if (!outputStat || outputStat.mtimeMs < inputStat.mtimeMs) {
    const temp = `${compressed}.tmp`;
    await pipeline(createReadStream(file), createGzip({ level: 9 }), createWriteStream(temp));
    await rename(temp, compressed);
    generated++;
  }
}
let bytes = 0;
for (const file of await walk(source)) {
  if (file.endsWith('.geojson') || file.endsWith('.tmp')) continue;
  const rel = relative(source, file);
  const target = join(destination, rel);
  await mkdir(resolve(target, '..'), { recursive: true });
  await copyFile(file, target);
  bytes += (await stat(file)).size;
}
await writeFile(join(destination, '.nojekyll'), '');
console.log(`Spatial assets ready: ${(bytes / 1024 / 1024).toFixed(1)} MiB, ${generated} gzip files generated`);

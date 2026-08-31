import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function platformSlot(platform) {
  if (platform === 'win32') return 'win';
  if (platform === 'linux') return 'linux';
  throw new Error(`Unsupported dependency platform: ${platform}`);
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modulesPath = resolve(repositoryRoot, 'node_modules');

if (!existsSync(modulesPath)) {
  throw new Error(`Cannot write platform marker because ${modulesPath} does not exist`);
}

writeFileSync(resolve(modulesPath, '.platform'), `${platformSlot(process.platform)}\n`, {
  encoding: 'utf8',
});

import { existsSync, readFileSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function platformSlot(platform) {
  if (platform === 'win32') return 'win';
  if (platform === 'linux') return 'linux';
  throw new Error(`Unsupported dependency platform: ${platform}`);
}

function readSlot(modulesPath) {
  const markerPath = resolve(modulesPath, '.platform');
  if (!existsSync(markerPath)) {
    throw new Error(`Missing dependency platform marker: ${markerPath}`);
  }
  const slot = readFileSync(markerPath, 'utf8').trim();
  if (slot !== 'win' && slot !== 'linux') {
    throw new Error(`Unknown dependency platform marker: ${slot}`);
  }
  return slot;
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const currentSlot = platformSlot(process.platform);
const activePath = resolve(repositoryRoot, 'node_modules');
const currentCachePath = resolve(repositoryRoot, `node_modules.${currentSlot}`);
const temporaryPath = resolve(repositoryRoot, `.node_modules.swap-${process.pid}`);

if (existsSync(temporaryPath)) {
  throw new Error(`Refusing to overwrite swap path: ${temporaryPath}`);
}

if (!existsSync(activePath)) {
  if (!existsSync(currentCachePath)) {
    throw new Error(`No ${currentSlot} dependencies are installed; run pnpm install once`);
  }
  renameSync(currentCachePath, activePath);
  process.exit(0);
}

const activeSlot = readSlot(activePath);
if (activeSlot === currentSlot) process.exit(0);

const activeCachePath = resolve(repositoryRoot, `node_modules.${activeSlot}`);
if (existsSync(activeCachePath)) {
  throw new Error(`Refusing to overwrite dependency cache: ${activeCachePath}`);
}

if (!existsSync(currentCachePath)) {
  renameSync(activePath, activeCachePath);
  throw new Error(`No ${currentSlot} dependencies are installed; run pnpm install once`);
}

renameSync(activePath, temporaryPath);
try {
  renameSync(currentCachePath, activePath);
  try {
    renameSync(temporaryPath, activeCachePath);
  } catch (error) {
    renameSync(activePath, currentCachePath);
    renameSync(temporaryPath, activePath);
    throw error;
  }
} catch (error) {
  if (existsSync(temporaryPath) && !existsSync(activePath)) {
    renameSync(temporaryPath, activePath);
  }
  throw error;
}

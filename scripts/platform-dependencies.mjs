import { existsSync, readFileSync, readdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

export function platformSlot(platform) {
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

function requireSlot(modulesPath, expectedSlot) {
  const actualSlot = readSlot(modulesPath);
  if (actualSlot !== expectedSlot) {
    throw new Error(
      `Expected ${expectedSlot} dependency platform marker at ${modulesPath}; found ${actualSlot}`,
    );
  }
}

export function syncPlatformDependencies(
  repositoryRoot,
  currentSlot,
  { rename = renameSync } = {},
) {
  if (currentSlot !== 'win' && currentSlot !== 'linux') {
    throw new Error(`Unsupported dependency slot: ${currentSlot}`);
  }

  const staleSwap = readdirSync(repositoryRoot).find((name) =>
    name.startsWith('.node_modules.swap-'),
  );
  if (staleSwap !== undefined) {
    throw new Error(`Refusing stale dependency swap path: ${resolve(repositoryRoot, staleSwap)}`);
  }

  const activePath = resolve(repositoryRoot, 'node_modules');
  const currentCachePath = resolve(repositoryRoot, `node_modules.${currentSlot}`);
  const temporaryPath = resolve(repositoryRoot, `.node_modules.swap-${process.pid}`);

  if (!existsSync(activePath)) {
    if (!existsSync(currentCachePath)) {
      throw new Error(`No ${currentSlot} dependencies are installed; run pnpm install once`);
    }
    requireSlot(currentCachePath, currentSlot);
    rename(currentCachePath, activePath);
    return;
  }

  const activeSlot = readSlot(activePath);
  if (activeSlot === currentSlot) return;

  const activeCachePath = resolve(repositoryRoot, `node_modules.${activeSlot}`);
  if (existsSync(activeCachePath)) {
    throw new Error(`Refusing to overwrite dependency cache: ${activeCachePath}`);
  }

  if (!existsSync(currentCachePath)) {
    rename(activePath, activeCachePath);
    throw new Error(`No ${currentSlot} dependencies are installed; run pnpm install once`);
  }

  requireSlot(currentCachePath, currentSlot);
  rename(activePath, temporaryPath);
  try {
    rename(currentCachePath, activePath);
    try {
      rename(temporaryPath, activeCachePath);
    } catch (error) {
      rename(activePath, currentCachePath);
      rename(temporaryPath, activePath);
      throw error;
    }
  } catch (error) {
    if (existsSync(temporaryPath) && !existsSync(activePath)) {
      rename(temporaryPath, activePath);
    }
    throw error;
  }
}

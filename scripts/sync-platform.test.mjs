import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { syncPlatformDependencies } from './platform-dependencies.mjs';

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function createRepository() {
  const root = mkdtempSync(resolve(tmpdir(), 'clinic-platform-sync-'));
  temporaryRoots.push(root);
  return root;
}

function createModules(root, name, slot) {
  const modulesPath = resolve(root, name);
  mkdirSync(modulesPath);
  if (slot !== undefined) writeFileSync(resolve(modulesPath, '.platform'), slot);
  return modulesPath;
}

function readMarker(root, name) {
  return readFileSync(resolve(root, name, '.platform'), 'utf8');
}

test('refuses every stale swap directory before changing dependencies', () => {
  const root = createRepository();
  createModules(root, 'node_modules', 'win');
  mkdirSync(resolve(root, '.node_modules.swap-99999'));

  assert.throws(
    () => syncPlatformDependencies(root, 'win'),
    /stale dependency swap path/u,
  );
  assert.equal(readMarker(root, 'node_modules'), 'win');
});

for (const [description, marker, message] of [
  ['a missing marker', undefined, /Missing dependency platform marker/u],
  ['an unknown marker', 'mac', /Unknown dependency platform marker/u],
  ['the wrong marker', 'linux', /Expected win dependency platform marker/u],
]) {
  test(`rejects a cached slot with ${description}`, () => {
    const root = createRepository();
    createModules(root, 'node_modules.win', marker);

    assert.throws(() => syncPlatformDependencies(root, 'win'), message);
    assert.equal(existsSync(resolve(root, 'node_modules')), false);
    assert.equal(existsSync(resolve(root, 'node_modules.win')), true);
  });
}

test('refuses an occupied destination without changing either slot', () => {
  const root = createRepository();
  createModules(root, 'node_modules', 'linux');
  createModules(root, 'node_modules.linux', 'linux');
  createModules(root, 'node_modules.win', 'win');

  assert.throws(
    () => syncPlatformDependencies(root, 'win'),
    /Refusing to overwrite dependency cache/u,
  );
  assert.equal(readMarker(root, 'node_modules'), 'linux');
  assert.equal(readMarker(root, 'node_modules.linux'), 'linux');
  assert.equal(readMarker(root, 'node_modules.win'), 'win');
});

test('swaps two validated dependency slots', () => {
  const root = createRepository();
  createModules(root, 'node_modules', 'linux');
  createModules(root, 'node_modules.win', 'win');

  syncPlatformDependencies(root, 'win');

  assert.equal(readMarker(root, 'node_modules'), 'win');
  assert.equal(readMarker(root, 'node_modules.linux'), 'linux');
  assert.equal(
    existsSync(resolve(root, `.node_modules.swap-${process.pid}`)),
    false,
  );
});

test('rolls back both slots if the final rename fails', () => {
  const root = createRepository();
  createModules(root, 'node_modules', 'linux');
  createModules(root, 'node_modules.win', 'win');
  let renameCount = 0;

  assert.throws(
    () =>
      syncPlatformDependencies(root, 'win', {
        rename(source, destination) {
          renameCount += 1;
          if (renameCount === 3) throw new Error('synthetic rename failure');
          renameSync(source, destination);
        },
      }),
    /synthetic rename failure/u,
  );

  assert.equal(readMarker(root, 'node_modules'), 'linux');
  assert.equal(readMarker(root, 'node_modules.win'), 'win');
  assert.equal(existsSync(resolve(root, 'node_modules.linux')), false);
  assert.equal(
    existsSync(resolve(root, `.node_modules.swap-${process.pid}`)),
    false,
  );
});

test('parks the active slot when the current platform has not been installed', () => {
  const root = createRepository();
  createModules(root, 'node_modules', 'linux');

  assert.throws(
    () => syncPlatformDependencies(root, 'win'),
    /No win dependencies are installed/u,
  );
  assert.equal(existsSync(resolve(root, 'node_modules')), false);
  assert.equal(readMarker(root, 'node_modules.linux'), 'linux');
});

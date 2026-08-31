import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platformSlot, syncPlatformDependencies } from './platform-dependencies.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const currentSlot = platformSlot(process.platform);
syncPlatformDependencies(repositoryRoot, currentSlot);

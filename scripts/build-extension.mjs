import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'apps/chrome-extension/lib');

await mkdir(target, { recursive: true });
await copyFile(resolve(root, 'src/core/selection.js'), resolve(target, 'selection.js'));
await copyFile(resolve(root, 'src/data/dataset.json'), resolve(target, 'dataset.json'));
console.log('Chrome extension library synced:', target);

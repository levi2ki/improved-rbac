import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const packagePaths = [
  new URL('../../rbac-core/package.json', import.meta.url),
  new URL('../package.json', import.meta.url),
];

test('published core packages reference their emitted declaration entry point', async () => {
  for (const packagePath of packagePaths) {
    const manifest = JSON.parse(await readFile(packagePath, 'utf8'));

    assert.equal(manifest.types, './dist/index.d.ts');
    assert.equal(manifest.exports['.'].types, './dist/index.d.ts');
  }
});

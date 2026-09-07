import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { test } from 'node:test';

const packageRoots = [
  new URL('../../rbac-core/', import.meta.url),
  new URL('../', import.meta.url),
];

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test('core packages emit ESM-only build artifacts', async () => {
  for (const packageRoot of packageRoots) {
    assert.equal(await exists(new URL('dist/index.esm.js', packageRoot)), true);
    assert.equal(await exists(new URL('dist/index.js', packageRoot)), false);
  }
});

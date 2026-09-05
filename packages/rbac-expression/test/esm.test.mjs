import assert from 'node:assert/strict';
import { test } from 'node:test';

test('the built public entry loads in Node ESM and evaluates grant policies', async () => {
    const { createExpression, resolved, unresolved } = await import('@levi2ki/rbac-expression');
    const { createModule, getDefaultRegistry, register } = await import('@levi2ki/rbac-core');
    const registry = register(createModule()('document'))(getDefaultRegistry());
    const { has, not } = createExpression(registry);

    assert.equal(has('document.read')({ document: resolved(['read']) }), true);
    assert.equal(has('document.read')({ document: resolved([]) }), false);
    assert.equal(not('document.read')({ document: resolved([]) }), true);
    assert.equal(not('document.read')({ document: unresolved }), false);
});

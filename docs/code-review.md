# Code Review

## Overall Assessment

The implementation is small, readable, and mostly aligned with the intended scope.

The strongest part of the code is the type-level bridge between module registration and valid grant expressions.

## Package Review

### `@levi2ki/rbac-core`

Strengths:

- `createModule<Permissions>()('scope')` is minimal and easy to adopt.
- `ModulePermissions<M>` exposes the hidden permission type in a practical way.
- `register()` protects against duplicate module names at runtime.
- the registry type accumulates module information across chained registrations

Concerns:

- `createModule<Permissions>()` accepts any type as `Permissions`, but downstream expression building assumes string-compatible grant tokens
- `getDefaultRegistry()` returns an intentionally loose empty registry type, which works, but is not very self-documenting

### `@levi2ki/rbac-expression`

Strengths:

- `Scopes<Reg>` correctly derives `"scope.permission"` combinations from the registry
- `and` and `or` merge required context types via `UnionToIntersection`
- `has` and `not` are tiny and easy to reason about

Concerns:

- `createExpression(registry)` does not use `registry` at runtime, so the function contract is more type-driven than behavior-driven
- the public context shape is still somewhat opinionated because it requires package-owned grant state wrappers instead of accepting plain arrays directly

## Test Review

The main behavioral tests are in `packages/rbac-expression/src/lib/dsl-expression/expression.test.ts`.

What the tests currently establish:

- `has`, `not`, `and`, and `or` exist
- `has` returns true when the permission exists
- `has` returns false when the permission is missing
- `has` returns false for unresolved state
- `not` returns true when the permission is absent from a present scope
- `not` returns false when the permission exists
- `not` returns false for unresolved state
- `and` and `or` behave as expected for simple compositions
- insufficient context is rejected at the type level for composed expressions

What is missing:

- direct tests for `rbac-core`
- tests for duplicate module registration throwing at runtime
- tests around package export shape
- tests for consumer-facing integration across package boundaries

## Operational Issues

The current codebase has a few implementation-level issues that should be fixed before treating the packages as production-ready:

- CI currently invokes `Nx` via `pnpm dlx nx` instead of the pinned workspace version
- package `types` paths do not match generated declaration filenames

## Recommendation

The code is directionally good.

The next implementation pass should focus on:

- hardening packaging
- hardening tests around `rbac-core`
- making public API expectations more explicit
- documenting the intended relationship between grant vocabulary, typed registry, dynamic grant context, and policy expressions

That work will improve confidence more than adding new operators right now.

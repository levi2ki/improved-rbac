# @levi2ki/rbac-react

React 18 and 19 adapters for typed grant-based policy expressions.

This package is ESM-only. Import `createReactPolicy` from `@levi2ki/rbac-react`
and call it once for an application registry to obtain `PolicyProvider`,
`PolicyGate`, `usePolicy`, `useGrantContext`, `createPolicyBoundary`, and
`withPolicy`. Type declarations are published at `dist/index.d.ts`.

See the repository README for the vocabulary, registry, and expression layers.

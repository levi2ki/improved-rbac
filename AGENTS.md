# AGENTS.md

## Repository Framing

This repository is a small `pnpm` + `Nx` monorepo for a typed, grant-based policy enforcement layer.

It is not a full RBAC platform.

The core idea is:

- grant vocabulary exists somewhere
- the application builds a typed registry from that vocabulary
- runtime grants are loaded for the current context
- policy expressions are evaluated on demand in code

The vocabulary source is intentionally abstract. It may be:

- local source code
- generated from OpenAPI
- generated from another contract format
- provided by a shared schema package

Do not assume the backend contract is the only valid source of truth.

## Package Layout

- `packages/rbac-core`
  Typed primitives for grant modules and registries.
- `packages/rbac-expression`
  Typed policy expression layer on top of the registry.

## Key Concepts

- `grant vocabulary`
  The set of allowed grants for known scopes.
- `typed registry`
  A compile-time safe mapping of scopes to grant sets.
- `runtime grant context`
  Dynamically loaded grants for the current page, entity, or request context.
- `policy expression`
  Business rule is composition of `has`, `not`, `and`, and `or`.
- `framework adapter`
  React hooks, Nest decorators, guards, or other integration layers built on top of the expression system.

Keep those concepts separate when making changes.

## Important Files

- `README.md`
  Product-level repository documentation.
- `docs/intent-and-scope.md`
  Source of truth for the intended product boundary.
- `docs/design-review.md`
  Review of API and product direction.
- `docs/code-review.md`
  Review of implementation and tests.
- `docs/architecture-review.md`
  Layering, boundaries, and evolution notes.
- `docs/TODO.md`
  Actionable follow-up items from the reviews.
- `packages/rbac-core/src/lib/module.ts`
  Module and grant typing primitives.
- `packages/rbac-core/src/lib/registry.ts`
  Typed registry accumulation and duplicate-name protection.
- `packages/rbac-expression/src/lib/dsl-expression/expression.ts`
  Policy expression construction.
- `packages/rbac-expression/src/lib/dsl-expression/expression.test.ts`
  Main behavioral specification of current expression semantics.

## Tooling

- Package manager: `pnpm`
- Workspace orchestration: `Nx`
- Build: `rollup`
- Tests: `jest` + `@swc/jest`
- Functional runtime helpers: `fp-ts`
- Local publishing support: Verdaccio via root Nx target `local-registry`

## Working Rules

- Prefer reading source and `docs/` over stale template README content in package subfolders.
- Prefer `pnpm` commands over `npm`.
- Do not edit generated output under `dist/`, `tmp/`, `.nx/`, or `test-output/`.
- Keep framework-specific concerns outside `rbac-core` and `rbac-expression`.
- Preserve the repository boundary:
  vocabulary -> registry -> runtime grants -> expressions -> adapters
- Avoid pulling in user, role, storage, or transport concerns unless the task explicitly adds a new package for them.

## Verified Commands

Run from repo root:

- `pnpm exec tsc -b`
- `pnpm nx build @levi2ki/rbac-core`
- `pnpm nx build @levi2ki/rbac-expression`

CI currently uses Nx run-many entrypoint defined in `.github/workflows/ci.yml`.

## Current Known Issues

- Package `types` paths in both package manifests do not match the generated declaration filenames in `dist/`.
- `packages/rbac-expression/jest.config.ts` currently has the wrong `displayName`.
- Package and root READMEs outside the root `README.md` are still mostly template content.
- Direct `jest` invocation can be fragile depending on local TypeScript/Jest config loading behavior.

## Review Guidance

If asked for a review, evaluate the repository against its real goal:

- typed grant vocabulary
- reusable policy expressions
- framework-agnostic enforcement core
- monorepo reuse across frontend and backend adapters

Do not criticize the project for not being a full authorization platform unless the requested scope changes.

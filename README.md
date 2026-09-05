# Levi2ki Policy Expressions

Typed, grant-based policy enforcement for application code.

This repository provides a small, framework-agnostic core for building reusable policy expressions over a known grant vocabulary.

## Why This Exists

Many applications do not want frontend or edge services to reason about users, roles, AD groups, or authorization storage directly.

Instead, some upstream system already resolves access and returns only the effective grants for the current context.

Typical example:

- backend receives `current-user`, `projectId`, and `taskId`
- backend computes effective grants from SSO, project-level rules, and entity-level rules
- backend returns grants grouped by security scope, such as:
  - `system`: `[READ_PROJECTS]`
  - `project`: `[FULL_EDIT_ACCESS]`
  - `task`: `[EDIT, ISSUE_CREATE]`

Application code still needs a consistent way to answer questions like:

- can this user see the project list?
- can this component render edit controls?
- should this information be hidden entirely?
- can this request pass a framework guard?

This repository solves that specific problem.

## What It Is

This project is a typed policy expression layer built on top of a typed registry of grants.

It gives you:

- typed grant scopes
- typed grant names
- composable policy predicates
- framework-agnostic enforcement logic
- reuse of the same policy expressions across a monorepo

## What It Is Not

This project is not trying to provide:

- user management
- role management
- identity integration
- access storage
- policy persistence
- admin UI
- audit logging
- a universal authorization platform

The goal is narrower and more useful:

`grant vocabulary -> typed registry -> dynamic grants -> policy expressions`

## Vocabulary Is Source-Agnostic

The grant vocabulary is structural. It does not have to come from a backend contract.

It may be:

- defined locally
- generated from OpenAPI
- generated from another schema
- shared from another package in a monorepo

The important part is that a stable vocabulary exists and can be turned into a typed registry.

## Packages

### `@levi2ki/rbac-core`

Provides typed primitives:

- `createModule<Permissions>()('scope')`
- `Module`
- `ModulePermissions`
- `Registry`
- `register()`

This package is intentionally small and type-driven.

### `@levi2ki/rbac-expression`

Provides policy expression helpers:

- `GrantState`
- `resolved(...)`
- `unresolved`
- `createExpression(registry)`
- `has`
- `not`
- `and`
- `or`

This package builds reusable business rules on top of the registry.

## Mental Model

There are four separate concepts in the architecture:

1. Grant vocabulary
2. Typed registry
3. Runtime grant context
4. Policy expressions

Framework-specific integration should sit on top of those concepts, not inside them.

That means:

- React can use hooks and context providers
- NestJS can use guards and decorators
- shared expressions can live in common packages

The expressions themselves should remain reusable and framework-agnostic.

## Example

```ts
import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import {
  createExpression,
  resolved,
  unresolved,
} from '@levi2ki/rbac-expression';

enum SystemGrant {
  READ_PROJECTS = 'READ_PROJECTS',
  FULL_EDIT_ACCESS = 'FULL_EDIT_ACCESS',
}

enum ProjectGrant {
  FULL_EDIT_ACCESS = 'FULL_EDIT_ACCESS',
}

enum TaskGrant {
  EDIT = 'EDIT',
  ISSUE_CREATE = 'ISSUE_CREATE',
}

const registry = register(createModule<TaskGrant>()('task'))(
  register(createModule<ProjectGrant>()('project'))(
    register(createModule<SystemGrant>()('system'))(getDefaultRegistry())
  )
);

const { has, not, and, or } = createExpression(registry);

export const canSeeProjects = has('system.READ_PROJECTS');

export const canEditTaskAttributes = or([
  has('system.FULL_EDIT_ACCESS'),
  has('project.FULL_EDIT_ACCESS'),
  and([
    has('task.EDIT'),
    not('task.ISSUE_CREATE'),
  ]),
]);

const grants = {
  system: resolved([SystemGrant.READ_PROJECTS]),
  project: unresolved,
  task: resolved([TaskGrant.EDIT]),
};

canSeeProjects(grants); // true
canEditTaskAttributes(grants); // true
```

## Typical Usage

1. Define or generate the grant vocabulary.
2. Build a typed registry from the vocabulary.
3. Load current grants dynamically for the relevant runtime context.
4. Define reusable policy expressions.
5. Invoke those expressions in UI components, route guards, decorators, or service-level checks.

Backend authorization still remains authoritative. This library does not replace backend enforcement. It gives application code a shared and typed way to express business security rules.

The public runtime model distinguishes between:

- `resolved([])` for a known empty grant set
- `unresolved` for grants that are not available yet

At the current stage, expressions use a conservative deny-by-default interpretation for unresolved state.

## Repository Structure

- `packages/rbac-core`
- `packages/rbac-expression`
- `docs/intent-and-scope.md`
- `docs/design-review.md`
- `docs/code-review.md`
- `docs/architecture-review.md`
- `docs/TODO.md`

## Commands

From the repository root:

```sh
pnpm exec tsc -b
pnpm nx build @levi2ki/rbac-core
pnpm nx build @levi2ki/rbac-expression
```

## Current Status

The repository is already useful as a compact typed expression layer, but it still has some implementation follow-up items:

- package type entrypoints need alignment with generated declaration files
- test coverage around `rbac-core` should be expanded

See [docs/TODO.md](docs/TODO.md) for the current follow-up list.

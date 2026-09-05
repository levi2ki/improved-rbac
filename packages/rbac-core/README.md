# @levi2ki/rbac-core

Typed primitives for building a grant registry.

This package does not evaluate policy and does not know anything about users, roles, storage, transports, or frameworks. It only describes which grant scopes exist and which grant tokens belong to each scope.

## Installation

```sh
pnpm add @levi2ki/rbac-core
```

## Usage

```ts
import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';

enum ProjectGrant {
  READ = 'READ',
  EDIT = 'EDIT',
}

enum TaskGrant {
  EDIT = 'EDIT',
  ISSUE_CREATE = 'ISSUE_CREATE',
}

const registry = register(createModule<TaskGrant>()('task'))(
  register(createModule<ProjectGrant>()('project'))(getDefaultRegistry())
);
```

The resulting registry carries enough type information for expression packages to derive valid grant references such as `project.READ` or `task.EDIT`.

## API

- `createModule<Permissions>()('scope')`
  Creates a typed module descriptor for a grant scope.
- `register(module)(registry)`
  Adds a module to a registry and throws if the module name is already registered at runtime.
- `getDefaultRegistry()`
  Creates an empty registry.
- `Module`, `ModulePermissions`, `Registry`
  Type helpers used by higher-level packages.

## Boundary

Keep this package focused on registry typing and duplicate-name protection. Framework adapters, grant loading, and policy expression evaluation belong outside `rbac-core`.

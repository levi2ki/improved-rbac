# @levi2ki/rbac-expression

Typed policy expressions over a grant registry.

This package is a framework-agnostic policy enforcement layer. It evaluates reusable business rules against runtime grant state, but it does not fetch grants, manage users, manage roles, or replace backend authorization.

## Installation

```sh
pnpm add @levi2ki/rbac-expression @levi2ki/rbac-core
```

## Usage

```ts
import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import { createExpression, resolved, unresolved } from '@levi2ki/rbac-expression';

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

## Boolean Equivalent

The expression DSL intentionally mirrors basic boolean operators:

- `has('scope.GRANT')` is a typed grant membership check
- `not(...)` is logical `!`
- `and([...])` is logical `&&`
- `or([...])` is logical `||`

Conceptually, the previous `canEditTaskAttributes` expression is equivalent to this boolean rule:

```ts
const canEditTaskAttributes =
  system.has('FULL_EDIT_ACCESS') ||
  project.has('FULL_EDIT_ACCESS') ||
  (task.has('EDIT') && !task.has('ISSUE_CREATE'));
```

The real DSL version represents that rule as a reusable evaluator:

```ts
const canEditTaskAttributes = or([
  has('system.FULL_EDIT_ACCESS'),
  has('project.FULL_EDIT_ACCESS'),
  and([
    has('task.EDIT'),
    not('task.ISSUE_CREATE'),
  ]),
]);
```

With the example grant context, the result is `true` because the last branch is true:

```ts
task.EDIT && !task.ISSUE_CREATE
```

An unresolved scope only affects the branch that reads it. In the example, `project: unresolved` makes `has('project.FULL_EDIT_ACCESS')` evaluate to `false`, but it does not make the whole `or(...)` fail.

## Grant State

Runtime grants are represented with the package-owned `GrantState` type:

- `resolved([...])`
  Grants for the scope are known, including the valid empty state `resolved([])`.
- `unresolved`
  Grants for the scope are not available yet.

Expression evaluation is conservative for unresolved state:

- `has(...)` returns `false`
- `not(...)` returns `false`

This keeps loading or missing grant data distinct from a known empty grant set.

## API

- `createExpression(registry)`
  Creates typed expression constructors. The registry is primarily used for type inference.
- `PolicyContext<Registry, 'scope.GRANT'>`
  Type helper for the grant context required by a single grant expression.
- `PolicyEvaluator<Context>`
  Function type for reusable policy evaluators.
- `has('scope.GRANT')`
  Checks that a resolved scope contains the grant.
- `not('scope.GRANT')`
  Checks that a resolved scope does not contain the grant.
- `and([...])`
  Evaluates all child expressions. Empty `and([])` returns `true`.
- `or([...])`
  Evaluates any child expression. Empty `or([])` returns `false`.
- `resolved(grants)`
  Creates a resolved grant state.
- `unresolved`
  Represents grants that have not been loaded or are not available.

## Boundary

Keep this package focused on expression construction and evaluation. React hooks, NestJS guards, decorators, request context wiring, and grant fetching should be implemented as adapters on top of this package.

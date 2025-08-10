# @levi2ki/rbac-expression

A powerful Domain Specific Language (DSL) library for building complex Role-Based Access Control (RBAC) expressions with type safety and functional programming principles.

## Overview

`rbac-expression` provides a fluent, composable API for creating complex permission expressions that can be evaluated against user contexts. Built on top of `@levi2ki/rbac-core` and `fp-ts`, it offers:

-   **Type-safe expressions** with full TypeScript support
-   **Functional composition** using `Reader` monads
-   **Composable operators** for building complex permission logic
-   **Performance optimized** for large permission sets and deep nesting
-   **Zero runtime dependencies** beyond the core libraries

## Installation

```bash
pnpm add @levi2ki/rbac-expression
```

## Quick Start

```typescript
import { createExpression } from '@levi2ki/rbac-expression';
import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import { pipe } from 'fp-ts/function';
import * as Option from 'fp-ts/Option';

// Define your permission enums
enum UserPermissions {
    READ = 'READ',
    WRITE = 'WRITE',
    DELETE = 'DELETE',
}

enum TeamPermissions {
    MANAGE = 'MANAGE',
    VIEW = 'VIEW',
}

// Create and configure the registry
const registry = pipe(getDefaultRegistry(), register(createModule<UserPermissions>()('user')), register(createModule<TeamPermissions>()('team')));

// Create expression functions
const { has, not, and, or } = createExpression(registry);

// Define user context
const userContext = {
    user: Option.some([UserPermissions.READ, UserPermissions.WRITE]),
    team: Option.some([TeamPermissions.VIEW]),
};

// Create and evaluate expressions
const canEdit = has('user.WRITE');
const cannotDelete = not('user.DELETE');
const canManageTeam = has('team.MANAGE');

const complexExpression = and([canEdit, cannotDelete, or([canManageTeam, has('user.READ')])]);

// Evaluate the expression
const result = complexExpression(userContext);
console.log(result); // true
```

## Core Concepts

### Expressions as Functions

All expressions in `rbac-expression` are functions that take a context and return a boolean. This makes them:

-   **Composable**: Combine expressions using `and`, `or`, and `not`
-   **Reusable**: Define expressions once and use them multiple times
-   **Testable**: Easy to unit test individual expressions
-   **Lazy**: Expressions are only evaluated when called

### Context Structure

The context is a record where each key corresponds to a scope (module) and the value is an `Option<Permission[]>`:

```typescript
type Context = {
    [scope: string]: Option<Permission[]>;
};
```

### Type Safety

The library provides full type safety through TypeScript:

-   Permission strings are validated at compile time
-   Scope names are inferred from the registry
-   Context types are automatically inferred
-   Type errors for invalid permission combinations

## API Reference

### `createExpression(registry)`

Creates expression functions bound to a specific registry.

**Parameters:**

-   `registry`: A registry instance from `@levi2ki/rbac-core`

**Returns:**

-   `{ has, not, and, or }`: Object containing all expression operators

### `has(permission)`

Checks if a specific permission exists in the context.

**Parameters:**

-   `permission`: String in format `"scope.permission"` (e.g., `"user.READ"`)

**Returns:**

-   `Reader<Context, boolean>`: Function that evaluates to `true` if permission exists

**Example:**

```typescript
const canRead = has('user.READ');
const result = canRead(userContext); // true if user has READ permission
```

### `not(permission)`

Checks if a specific permission does NOT exist in the context.

**Parameters:**

-   `permission`: String in format `"scope.permission"`

**Returns:**

-   `Reader<Context, boolean>`: Function that evaluates to `true` if permission doesn't exist

**Example:**

```typescript
const cannotDelete = not('user.DELETE');
const result = cannotDelete(userContext); // true if user lacks DELETE permission
```

### `and(expressions)`

Logical AND of multiple expressions. All expressions must evaluate to `true`.

**Parameters:**

-   `expressions`: Array of expression functions

**Returns:**

-   `Reader<Context, boolean>`: Function that evaluates to `true` only if ALL expressions are `true`

**Example:**

```typescript
const canEditAndView = and([has('user.WRITE'), has('user.READ')]);
```

### `or(expressions)`

Logical OR of multiple expressions. At least one expression must evaluate to `true`.

**Parameters:**

-   `expressions`: Array of expression functions

**Returns:**

-   `Reader<Context, boolean>`: Function that evaluates to `true` if ANY expression is `true`

**Example:**

```typescript
const canManageOrView = or([has('team.MANAGE'), has('team.VIEW')]);
```

## Advanced Usage

### Complex Permission Logic

```typescript
// User can edit if they have WRITE permission AND either are an admin OR have team management rights
const canEdit = and([has('user.WRITE'), or([has('user.ADMIN'), has('team.MANAGE')])]);

// User can delete if they have DELETE permission AND cannot be deleted themselves
const canDelete = and([has('user.DELETE'), not('user.CAN_BE_DELETED')]);
```

### Conditional Permissions

```typescript
// Different permissions based on user role
const userPermissions = user.isAdmin ? [has('user.ADMIN'), has('user.SUPER_USER')] : [has('user.READ'), has('user.WRITE')];

const effectivePermissions = and(userPermissions);
```

### Performance Considerations

The library is optimized for performance:

-   **Lazy evaluation**: Expressions are only computed when needed
-   **Short-circuit evaluation**: `and` and `or` operators stop early when possible
-   **Efficient permission lookup**: Uses optimized permission checking algorithms
-   **Memory efficient**: Minimal object creation during evaluation

## Testing

The library includes comprehensive test utilities and supports various testing scenarios:

```typescript
import { createTestContext, measurePerformance } from './__mocks__/test-data.mock';

// Performance testing
const { time, result } = measurePerformance(() => complexExpression(largeContext));
expect(time).toBeLessThan(100); // Ensure performance threshold

// Edge case testing
const emptyContext = { user: Option.none };
expect(has('user.READ')(emptyContext)).toBe(false);
```

## Building

```bash
nx build rbac-expression
```

## Running Tests

```bash
nx test rbac-expression
```

## Contributing

This package is part of the `improved-rbac` monorepo. See the root README for contribution guidelines.

## License

MIT License

Copyright (c) 2024 @levi2ki

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

# improved-rbac

A modern, type-safe Role-Based Access Control (RBAC) system built with TypeScript and functional programming principles. This monorepo provides a comprehensive solution for implementing robust permission systems in your applications.

## 🚀 What's Inside

### **@levi2ki/rbac-core** - Foundation Library

The core RBAC system that provides the building blocks for permission management:

-   Module and registry system
-   Permission definitions and validation
-   Extensible architecture for custom permission types

### **@levi2ki/rbac-expression** - DSL for Complex Permissions ⭐

A powerful Domain Specific Language for building complex permission expressions with full type safety:

```typescript
import { createExpression } from '@levi2ki/rbac-expression';
import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import { pipe } from 'fp-ts/function';
import * as Option from 'fp-ts/Option';

// Define permissions
enum UserPermissions {
    READ = 'READ',
    WRITE = 'WRITE',
    DELETE = 'DELETE',
    ADMIN = 'ADMIN',
}

enum TeamPermissions {
    MANAGE = 'MANAGE',
    VIEW = 'VIEW',
}

// Create registry
const registry = pipe(getDefaultRegistry(), register(createModule<UserPermissions>()('user')), register(createModule<TeamPermissions>()('team')));

// Create expressions
const { has, not, and, or } = createExpression(registry);

// Build complex permission logic
const canEditSensitiveData = and([has('user.WRITE'), or([has('user.ADMIN'), has('team.MANAGE')]), not('user.RESTRICTED')]);

// Evaluate against user context
const userContext = {
    user: Option.some([UserPermissions.WRITE, UserPermissions.ADMIN]),
    team: Option.some([TeamPermissions.VIEW]),
};

const result = canEditSensitiveData(userContext);
console.log(result); // true
```

**✨ Key Features:**

-   **Type-safe expressions** with full TypeScript support
-   **Functional composition** using Reader monads
-   **Composable operators** (`has`, `not`, `and`, `or`)
-   **Performance optimized** for large permission sets
-   **Zero runtime dependencies** beyond core libraries

**[📖 Read More →](./packages/rbac-expression/README.md)**

### **@levi2ki/rbac-react** - React Integration (Coming Soon! 🚧)

React hooks and components for seamless RBAC integration in React applications:

-   `usePermissions()` hook for permission checking
-   `<PermissionGate>` component for conditional rendering
-   Context providers for permission management
-   HOCs for higher-order component patterns

## 🛠️ Installation

```bash
# Install the entire monorepo
pnpm add @levi2ki/rbac-core @levi2ki/rbac-expression

# Or install individual packages
pnpm add @levi2ki/rbac-core
pnpm add @levi2ki/rbac-expression
```

## 🚀 Quick Start

1. **Set up your permission modules:**

```typescript
import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';

const registry = pipe(getDefaultRegistry(), register(createModule<UserPermissions>()('user')), register(createModule<TeamPermissions>()('team')));
```

2. **Create expressions:**

```typescript
import { createExpression } from '@levi2ki/rbac-expression';

const { has, and, or } = createExpression(registry);

const canAccessAdminPanel = and([has('user.ADMIN'), or([has('user.SUPER_USER'), has('team.ADMIN')])]);
```

3. **Evaluate permissions:**

```typescript
const userContext = {
    user: Option.some([UserPermissions.ADMIN]),
    team: Option.some([TeamPermissions.VIEW]),
};

const hasAccess = canAccessAdminPanel(userContext);
```

## 🏗️ Architecture

```
improved-rbac/
├── packages/
│   ├── rbac-core/          # Core RBAC system
│   ├── rbac-expression/    # DSL for complex permissions
│   └── rbac-react/         # React integration (coming soon)
├── examples/               # Usage examples
└── docs/                  # Documentation
```

## 🧪 Development

This is a monorepo built with [Nx](https://nx.dev) and managed with [pnpm](https://pnpm.io).

```bash
# Install dependencies
pnpm install

# Run tests
nx test

# Build packages
nx build

# Run linting
nx lint
```

## 📚 Documentation

-   **[Core Library](./packages/rbac-core/README.md)** - Foundation and architecture
-   **[Expression DSL](./packages/rbac-expression/README.md)** - Complex permission expressions
-   **[React Integration](./packages/rbac-react/README.md)** - Coming soon!

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `nx test`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

-   [x] Core RBAC system (`@levi2ki/rbac-core`)
-   [x] Expression DSL (`@levi2ki/rbac-expression`)
-   [ ] React integration (`@levi2ki/rbac-react`)
-   [ ] NestJS integration (`@levi2ki/rbac-nest`)
-   [ ] Vue.js integration
-   [ ] Angular integration
-   [ ] GraphQL directives
-   [ ] Database adapters
-   [ ] Performance benchmarks
-   [ ] Migration guides

## 🙏 Acknowledgments

-   Built with [fp-ts](https://gcanti.github.io/fp-ts/) for functional programming utilities
-   Powered by [Nx](https://nx.dev) for monorepo management
-   Type-safe by [TypeScript](https://www.typescriptlang.org/)

---

**Ready to build robust permission systems?** Start with [@levi2ki/rbac-core](./packages/rbac-core/README.md) for the foundation, then explore [@levi2ki/rbac-expression](./packages/rbac-expression/README.md) for complex permission logic! 🚀

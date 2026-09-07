# RBAC React Adapter Design

**Date:** 2026-09-05

## Goal

Add `@levi2ki/rbac-react`, a thin React adapter over the existing typed grant registry and policy expression packages.

The adapter provides runtime grant states through the React tree, evaluates reusable policies, and renders allow/deny branches. It does not load grants or redefine the expression language.

## Product Boundary

The repository keeps the following dependency and responsibility flow:

```text
grant vocabulary
  -> typed registry
  -> runtime grant states
  -> policy expressions
  -> React adapter
  -> application-specific adapters
```

The React package owns:

- a registry-bound React context;
- root context initialization;
- explicit nested scope inheritance and replacement;
- hooks for boolean policy evaluation and raw grant-context access;
- a declarative allow/deny component;
- a boundary component factory;
- a higher-order component built on the same boundary mechanism.

The React package does not own:

- grant fetching, caching, persistence, or transport;
- users, roles, tenants, route parameters, or entity identifiers;
- loading and request-error presentation;
- expression construction;
- application-specific authorization rules.

Applications remain responsible for converting their data source into `GrantState` values.

## Rejected Architecture: One Context Per Scope

The previous reference implementation associates a separate React context with every registered scope. Multi-scope policies then require predeclared module combinations, composed consumers, and hooks that dynamically traverse multiple contexts.

That approach is rejected because it produces a new composition API for every scope combination, couples policy use to provider topology, and can lead to unsafe dynamic hook composition. Avoiding this multi-module composition spaghetti is a primary reason for the new package.

## Selected Architecture

The package uses one registry-wide context with declarative nested policy boundaries.

```ts
const {
  PolicyProvider,
  PolicyGate,
  usePolicy,
  useGrantContext,
  createPolicyBoundary,
  withPolicy,
} = createReactPolicy(registry);
```

Each call to `createReactPolicy(registry)` creates a private React context associated with that factory result. A provider created by one factory does not satisfy hooks or components created by another factory, even if their registries are structurally similar at the type level.

The selected approach makes multi-scope evaluation independent of provider composition. A policy remains an ordinary framework-agnostic `PolicyEvaluator`; React does not add expression nodes or scope dependency metadata.

## Registry Grant Context

The factory derives a full readonly context type from the registry. Every registered scope maps to a `GrantState` containing only grants valid for that scope.

Conceptually:

```ts
type RegistryGrantContext<Reg> = {
  readonly [Scope in keyof Reg['modules']]: GrantState<GrantForScope<Reg, Scope>>;
};
```

The exact helper types may differ in implementation, but the public inferred behavior is binding:

- every registry scope exists in the runtime context;
- scope values are `GrantState` values;
- grants are checked against the vocabulary of their scope;
- policies requiring compatible subsets of the full context are accepted;
- policies requiring unknown or incompatible scopes are rejected by TypeScript.

## Root Policy Provider

`PolicyProvider` is the only root initializer for a factory's context.

```tsx
<PolicyProvider
  grants={{
    system: resolved(systemGrants),
  }}
>
  <App />
</PolicyProvider>
```

Its `grants` prop is a typed partial registry grant context. At runtime the provider enumerates the registry and creates a full context:

- supplied scopes use the supplied `GrantState`;
- omitted scopes become `unresolved`.

If a previously supplied root scope is omitted on a later render, it becomes `unresolved`; the provider does not retain stale values from an earlier render.

Hooks, gates, and nested boundaries require this root provider. A nested boundary never silently acts as a root provider.

## Policy Boundaries

`createPolicyBoundary` declares how every registry scope behaves at a subtree boundary.

```ts
const ProjectPolicyBoundary = createPolicyBoundary({
  default: 'reset',
  scopes: {
    system: 'inherit',
    project: 'provide',
  },
});
```

The `default` property is required and accepts `inherit` or `reset`. It defines the behavior of every scope not explicitly listed in `scopes`, including scopes added to the registry in the future.

Each explicit scope accepts one of three strategies:

- `inherit`: preserve the value from the parent context;
- `provide`: replace the parent value with the boundary's required `grants` prop;
- `reset`: replace the parent value with `unresolved`.

Example:

```tsx
<ProjectPolicyBoundary
  grants={{
    project: resolved(projectGrants),
  }}
>
  <ProjectPage />
</ProjectPolicyBoundary>
```

The `grants` prop contains exactly the scopes declared as `provide`:

- every `provide` scope is required;
- `inherit` and `reset` scopes cannot be passed;
- a provided value may be either `resolved(...)` or `unresolved`.

Allowing `unresolved` for a `provide` scope lets an application close access explicitly while changing entity context or loading replacement grants.

The required default strategy balances verbosity and safety:

- `default: 'inherit'` defines an open, compositional boundary;
- `default: 'reset'` defines an isolated boundary protected from context leaks;
- explicit scope entries document intentional exceptions.

## Boundary Resolution

For each registry scope, a boundary computes the next value using this order:

1. Read the explicit strategy from `config.scopes`, if present.
2. Otherwise use `config.default`.
3. For `inherit`, copy the parent value.
4. For `provide`, read the required value from the boundary's `grants` prop.
5. For `reset`, use `unresolved`.

The resulting object is a new full readonly registry context. Provider and boundary values are memoized so unchanged inputs do not create avoidable context updates.

## Hooks

The factory exposes two focused hooks.

### `usePolicy`

```ts
const allowed = usePolicy(canEditProject);
```

`usePolicy(policy)` evaluates a compatible `PolicyEvaluator` against the current full context and returns `boolean`.

The boolean return is a long-lived convenience contract. If the expression package later adds rich decisions, the React package can add `usePolicyDecision(policy)` while keeping `usePolicy(policy)` as the boolean projection of that decision.

### `useGrantContext`

```ts
const context = useGrantContext();
```

`useGrantContext()` returns the full readonly registry grant context. This supports application-specific decisions and diagnostics without forcing the common `usePolicy` call to return data most consumers do not need.

Neither hook owns loading or request-error state.

## Policy Gate

`PolicyGate` is a small declarative allow/deny component:

```tsx
<PolicyGate policy={canEditProject} fallback={<Forbidden />}>
  <EditButton />
</PolicyGate>
```

Its conceptual props are:

```ts
interface PolicyGateProps<Context> {
  readonly policy: PolicyEvaluator<Context>;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
}
```

`fallback` defaults to `null`.

The gate accepts a ready policy directly. It does not accept an expression-builder callback, render prop, loading state, or error state. Consumers needing imperative or dynamic rendering use `usePolicy`.

## Higher-Order Component

`withPolicy(config)` is a higher-order component built on the same boundary implementation returned by `createPolicyBoundary(config)`.

```ts
const SecuredProjectPage = withPolicy({
  default: 'reset',
  scopes: {
    system: 'inherit',
    project: 'provide',
  },
})(ProjectPage);
```

The wrapped component:

- gains a required `grants` prop derived from `provide` scopes;
- rejects wrapping a component that already declares its own `grants` prop;
- consumes the policy `grants` prop instead of forwarding it;
- forwards every original component prop unchanged;
- forwards `ref` to the original component or DOM node;
- receives a diagnostic `displayName`.

The first version does not guarantee hoisting arbitrary custom static fields from the wrapped component. Adding static hoisting requires a separate use case and contract.

## Missing Provider And Configuration Errors

Runtime grant availability and React configuration failures are different classes of condition.

`unresolved` is a valid runtime grant state. The expression package remains responsible for fail-closed evaluation. React does not turn `unresolved` into an exception, loader, or request error.

The following conditions throw a descriptive `Error` in development and production:

- a hook or gate is used outside its factory's `PolicyProvider`;
- a policy boundary is rendered without its factory's root provider;
- a boundary configuration references a scope absent from the registry;
- a boundary strategy has an unsupported runtime value;
- a `provide` scope is missing from runtime `grants`, including usage from JavaScript or through unsafe casts.

The first version does not expose custom public error classes. Tests assert stable diagnostic fragments rather than treating the complete message text as a public API.

If a policy evaluator throws, the adapter does not catch or reinterpret the exception. It propagates to the nearest React Error Boundary.

## Loading And Request Errors

The adapter does not infer UI state from policy denial.

An unresolved scope is not equivalent to a loading screen. A composite policy can allow access through one resolved scope while another relevant scope remains unresolved. The current boolean evaluator also does not expose enough dependency or failure metadata for the React adapter to decide which unresolved state controls presentation.

Application adapters therefore own:

- data-fetching state;
- loaders and skeletons;
- request error pages;
- retry behavior;
- conversion of successful data into `resolved(grants)`;
- selection of `unresolved` while data is unavailable.

## Context Update Granularity

The first version uses one context for the complete registry. Changing one scope changes the context value and can rerender consumers whose policies use other scopes.

This is an explicit trade-off accepted in exchange for:

- safe Rules of Hooks usage;
- direct multi-scope policies;
- no predeclared module combinations;
- no runtime policy metadata;
- a small public API.

Provider and boundary memoization reduces avoidable identity changes but does not provide selector-level subscriptions.

After adoption, applications should collect React Profiler evidence for representative route and layout trees:

- number of renders caused by updating one scope;
- commit duration before and after that update;
- number of rerendered consumers whose policies use unrelated scopes.

If measurements show a material problem, optimization options are evaluated in this order:

1. selectors backed by an external store while preserving the public adapter API;
2. runtime scope-dependency metadata attached to policies;
3. internal per-scope storage only if it avoids reintroducing public multi-module composers.

No optimization is added before a measured need exists.

## React Compatibility

The supported React majors are 18 and 19.

Implementation uses APIs available in both versions:

- `createContext`;
- `useContext`;
- `useMemo`;
- `<Context.Provider>`;
- `forwardRef` where required for HOC transparency.

The first version supports React single-page applications and conventional server-side rendering. React Server Components are outside the guaranteed contract and require separate design and consumer validation.

## Package And Build Contract

The package lives at:

```text
packages/rbac-react/
```

Its published name is:

```text
@levi2ki/rbac-react
```

It directly depends on:

- `@levi2ki/rbac-core` for registry and module types;
- `@levi2ki/rbac-expression` for policy and grant-state types and runtime helpers.

`react` is a peer dependency covering React 18 and 19. React, React DOM, and their types are development dependencies only where required for compilation and tests. React DOM is not a runtime dependency of the package.

The package is ESM-only. Its exports point to the actual generated artifacts, including `dist/index.d.ts`; it does not reproduce the existing packages' incorrect `dist/index.esm.d.ts` declaration path.

Rollup treats these as external:

- `react`;
- `react/jsx-runtime`;
- `@levi2ki/rbac-core`;
- `@levi2ki/rbac-expression`.

The package has no dependencies on routers, data-fetching libraries, UI kits, domain models, or `fp-ts`.

Adding CommonJS support is outside this feature. If required, it should be designed consistently for all repository packages rather than added only to the React adapter.

## Testing Strategy

Implementation follows strict red-green-refactor development. Every behavior is introduced by a test that is observed failing for the intended reason before production code is written.

React behavior tests use Jest, React Testing Library, and `jest-environment-jsdom`. They do not use the deprecated `react-test-renderer`.

### Pure Context Resolution

Tests cover:

- root initialization of omitted scopes to `unresolved`;
- removal of stale root values when a scope becomes omitted;
- boundary `inherit`, `provide`, and `reset` behavior;
- application of `default` to unspecified scopes;
- explicit `provide: unresolved`;
- multiple nested boundaries.

### React Integration

Tests cover:

- a multi-scope policy reading grants supplied at different tree levels;
- hook and gate updates after grants change;
- children and fallback rendering;
- every consumer failing outside the root provider;
- a boundary failing outside the root provider;
- policy exceptions propagating;
- unresolved grant states remaining distinct from resolved empty arrays.

### Higher-Order Component

Tests cover:

- consuming rather than forwarding the policy `grants` prop;
- forwarding original props;
- forwarding refs;
- sharing boundary semantics with `createPolicyBoundary`;
- assigning a diagnostic display name.

### Compile-Time Contracts

Type-level tests cover:

- unknown scopes and invalid grants;
- required `provide` scopes;
- rejection of `inherit` and `reset` scopes in boundary grants;
- rejection of a wrapped component's own `grants` prop;
- compatible subset policy contexts;
- rejection of incompatible policy contexts.

Expected type failures use explicit TypeScript assertions such as `@ts-expect-error` and are verified by the repository TypeScript build.

### Packaging And Compatibility

Verification covers:

- the package TypeScript build;
- its Nx build;
- consumer-style imports through the public entry point;
- correct declaration paths;
- absence of React and workspace dependencies from the bundle;
- separate compatibility smoke checks with React 18 and React 19.

## Documentation And Migration Examples

The package README documents:

- registry-bound factory creation;
- root provider setup;
- layered boundaries with safe defaults;
- hook and gate usage;
- HOC composition;
- unresolved versus resolved-empty semantics;
- performance trade-offs and profiling guidance;
- the division between generic React infrastructure and application data adapters.

Migration examples may preserve structural lessons from the private reference implementation, but published documentation must not identify or link to that project. It must not contain its name, repository or filesystem paths, URLs, product identifiers, domain vocabulary, source structure, or examples copied verbatim. Scope names, grant names, entity names, component names, routes, and surrounding business context must use neutral fictional equivalents.

## Explicit Non-Goals

The first version does not include:

- per-scope public contexts;
- multi-module composers;
- fetching or caching;
- router integration;
- loading or error UI;
- builder callbacks in `PolicyGate`;
- rich policy decisions;
- selector subscriptions or an external store;
- React Server Components support;
- custom static-field hoisting in `withPolicy`;
- CommonJS output.

## Acceptance Criteria

The design is satisfied when a consumer can:

1. Create one React adapter from a typed registry.
2. Initialize a full runtime context from partial root grants.
3. Provide independently loaded scopes at different tree levels.
4. Declare explicitly which scopes a subtree inherits, provides, or resets.
5. Prevent accidental context leaks with `default: 'reset'`.
6. Evaluate the same reusable multi-scope policy in React and non-React code.
7. Render allow/deny branches without a multi-module composition API.
8. Read the full grant context only when application logic needs it.
9. Wrap components without changing their original props or ref behavior.
10. Diagnose missing providers and invalid boundaries through explicit errors.
11. Consume the published ESM package with correct declarations under React 18 and React 19.

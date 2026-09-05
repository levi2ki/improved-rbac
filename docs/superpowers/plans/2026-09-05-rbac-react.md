# RBAC React Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an ESM-only `@levi2ki/rbac-react` package that provides a registry-wide grant context, explicit scope boundaries, boolean policy hooks, a gate, and a ref-transparent HOC.

**Architecture:** `createReactPolicy(registry)` creates one private React context and a closed set of registry-bound consumers. A root provider initializes every scope, while nested boundaries apply normalized `inherit | provide | reset` strategies. The React adapter evaluates existing `PolicyEvaluator` functions and never owns fetching, routing, expression construction, or loading/error UI.

**Tech Stack:** TypeScript 5.8, React 18/19, Jest 30, SWC Jest, React Testing Library, jsdom, Nx 21, Rollup 4, pnpm 9.

**Spec:** `docs/superpowers/specs/2026-09-05-rbac-react-design.md`

## Global Constraints

- Preserve the repository boundary: grant vocabulary -> typed registry -> runtime grant states -> policy expressions -> React adapter -> application adapters.
- Support React major versions 18 and 19 through APIs available in both versions.
- Publish `@levi2ki/rbac-react` as ESM-only with declarations at `dist/index.d.ts`.
- Keep `react`, `react/jsx-runtime`, `@levi2ki/rbac-core`, and `@levi2ki/rbac-expression` external to the bundle.
- Keep fetching, caching, routing, entity identifiers, loading UI, request-error UI, and expression construction outside the package.
- Use one registry-wide context; do not introduce per-scope contexts or multi-module composers.
- Throw configuration errors outside `PolicyProvider`; treat `unresolved` as a valid fail-closed runtime state.
- Keep `usePolicy(policy)` boolean; reserve a future additive `usePolicyDecision(policy)` for rich decisions.
- Implement every behavior with a verified RED -> GREEN -> REFACTOR cycle.
- Do not identify or link to the private reference project anywhere in published documentation. Do not expose its name, repository or filesystem paths, URLs, product identifiers, domain vocabulary, source structure, or examples copied verbatim. Use neutral fictional scopes, grants, entities, components, and routes.

---

## File Structure

Create the following package structure:

```text
packages/rbac-react/
├── .eslintrc.json
├── .eslintignore
├── .spec.swcrc
├── .swcrc
├── LICENSE
├── README.md
├── jest.config.ts
├── package.json
├── project.json
├── rollup.config.cjs
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
└── src/
    ├── index.ts
    └── lib/
        ├── policy-boundary.test.tsx
        ├── policy-boundary.tsx
        ├── policy-gate.test.tsx
        ├── policy-gate.tsx
        ├── react-policy-context.test.tsx
        ├── react-policy-context.tsx
        ├── test-registry.ts
        ├── types.type-test.tsx
        ├── types.ts
        ├── with-policy.test.tsx
        └── with-policy.tsx
```

File responsibilities:

- `types.ts`: registry-to-context mapping, compatible-policy constraints, boundary strategy inference, and public prop types.
- `react-policy-context.tsx`: private-context creation, root initialization, missing-provider guard, `useGrantContext`, and `usePolicy`.
- `policy-boundary.tsx`: configuration normalization, pure context resolution, and the boundary component factory.
- `policy-gate.tsx`: the ready-policy allow/deny component factory.
- `with-policy.tsx`: the boundary-backed, ref-forwarding HOC factory.
- `test-registry.ts`: one neutral registry and reusable policies used only by package tests.
- `types.type-test.tsx`: compile-time positive and negative API assertions.
- `index.ts`: public exports only.

Root files modified across the plan:

- `package.json`: add `packages/rbac-react` to workspace metadata.
- `pnpm-workspace.yaml`: add the package path.
- `pnpm-lock.yaml`: record React and test dependencies.
- `tsconfig.json`: add the project reference.
- `nx.json`: include `rbac-react` in release projects.
- `.github/workflows/ci.yml`: add React 18/19 compatibility jobs.

---

### Task 1: Scaffold the package and implement the root policy context

**Files:**

- Create: `packages/rbac-react/package.json`
- Create: `packages/rbac-react/project.json`
- Create: `packages/rbac-react/tsconfig.json`
- Create: `packages/rbac-react/tsconfig.lib.json`
- Create: `packages/rbac-react/tsconfig.spec.json`
- Create: `packages/rbac-react/jest.config.ts`
- Create: `packages/rbac-react/.spec.swcrc`
- Create: `packages/rbac-react/.swcrc`
- Create: `packages/rbac-react/.eslintrc.json`
- Create: `packages/rbac-react/.eslintignore`
- Create: `packages/rbac-react/LICENSE`
- Create: `packages/rbac-react/src/lib/test-registry.ts`
- Create: `packages/rbac-react/src/lib/types.ts`
- Create: `packages/rbac-react/src/lib/react-policy-context.test.tsx`
- Create: `packages/rbac-react/src/lib/react-policy-context.tsx`
- Create: `packages/rbac-react/src/index.ts`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Modify: `pnpm-lock.yaml`
- Modify: `tsconfig.json`
- Modify: `nx.json`

**Interfaces:**

- Consumes: `Registry`, `ModulePermissions`, `GrantState`, `PolicyEvaluator`, and `unresolved`.
- Produces: `RegistryGrantContext<Reg>`, `CompatiblePolicy<Full, Context>`, `createReactPolicyContext(registry)`, `PolicyProvider`, `useGrantContext`, and `usePolicy`.

- [ ] **Step 1: Create the package configuration without production implementation**

Use the neighboring package configs as the baseline, with these binding differences:

```json
{
  "name": "@levi2ki/rbac-react",
  "version": "0.1.0",
  "license": "MIT",
  "type": "module",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "default": "./dist/index.esm.js"
    }
  },
  "files": ["dist", "!**/*.tsbuildinfo"],
  "dependencies": {
    "@levi2ki/rbac-core": "workspace:^",
    "@levi2ki/rbac-expression": "workspace:^"
  },
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.0.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jest-environment-jsdom": "^30.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

Configure `tsconfig.lib.json` for `src/**/*.ts` and `src/**/*.tsx`, `jsx: "react-jsx"`, `rootDir: "src"`, `outDir: "dist"`, and references to both dependency package library configs. Configure `tsconfig.spec.json` for Jest, React, and jsdom tests. Copy `.eslintrc.json` and `.eslintignore` from `rbac-expression`. Base `.swcrc` on the neighboring package and enable TypeScript `tsx: true` plus React automatic runtime; use the same parser and transform settings in `.spec.swcrc`. Set Jest `displayName` to `@levi2ki/rbac-react`, transform `^.+\\.[tj]sx?$`, and use `jest-environment-jsdom`.

Add `packages/rbac-react` to both root workspace lists, add `./packages/rbac-react` to the root TypeScript references, and add `rbac-react` to `nx.json` release projects. Copy the repository's existing MIT license text verbatim from `packages/rbac-expression/LICENSE`. Run `pnpm install` after writing the manifests so the lockfile records the declared dependencies.

Use these exact project configurations:

```jsonc
// project.json
{
  "name": "@levi2ki/rbac-react",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/rbac-react/src",
  "projectType": "library",
  "tags": [],
  "targets": {}
}

// tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "files": [],
  "include": [],
  "references": [
    { "path": "../rbac-core" },
    { "path": "../rbac-expression" },
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}

// tsconfig.lib.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.lib.tsbuildinfo",
    "emitDeclarationOnly": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["es2022", "dom"],
    "types": ["node", "react"],
    "sourceMap": false,
    "declarationMap": false,
    "stripInternal": false,
    "removeComments": true,
    "customConditions": ["development"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "references": [
    { "path": "../rbac-core/tsconfig.lib.json" },
    { "path": "../rbac-expression/tsconfig.lib.json" }
  ],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.spec.tsx", "src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.mock.ts", "src/**/*.mock.tsx"]
}

// tsconfig.spec.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./out-tsc/jest",
    "types": ["jest", "node", "react", "react-dom"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["es2022", "dom"],
    "forceConsistentCasingInFileNames": true
  },
  "include": ["jest.config.ts", "src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.type-test.ts", "src/**/*.type-test.tsx", "src/**/*.d.ts"],
  "references": [{ "path": "./tsconfig.lib.json" }]
}
```

Use this Jest configuration:

```ts
/* eslint-disable */
import { readFileSync } from 'fs';

const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'));
swcJestConfig.swcrc = false;

export default {
  displayName: '@levi2ki/rbac-react',
  preset: '../../jest.preset.js',
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.[tj]sx?$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
```

Use this `.spec.swcrc`:

```json
{
  "jsc": {
    "target": "es2017",
    "parser": {
      "syntax": "typescript",
      "tsx": true,
      "dynamicImport": true
    },
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    }
  },
  "module": {
    "type": "commonjs"
  }
}
```

Use this build `.swcrc`:

```json
{
  "jsc": {
    "target": "es2017",
    "parser": {
      "syntax": "typescript",
      "tsx": true,
      "dynamicImport": true
    },
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    },
    "externalHelpers": true,
    "loose": true
  },
  "module": {
    "type": "es6"
  },
  "sourceMaps": true,
  "exclude": [
    "jest.config.ts",
    ".*\\.spec.tsx?$",
    ".*\\.test.tsx?$",
    ".*.js$"
  ]
}
```

Use the existing package ESLint configuration verbatim and `.eslintignore` containing exactly `node_modules` and `dist`, one entry per line.

- [ ] **Step 2: Write the failing root-context tests**

Create a neutral registry with `account` and `document` scopes. Test through rendered probes:

```tsx
const { PolicyProvider, useGrantContext, usePolicy } = createReactPolicyContext(registry);

function ContextProbe() {
  const context = useGrantContext();
  return <output>{JSON.stringify(context)}</output>;
}

function PolicyProbe() {
  return <output>{String(usePolicy(canReadDocument))}</output>;
}
```

Cover these behaviors separately:

- omitted root scopes are `unresolved`;
- removing a previously supplied root scope resets it to `unresolved` after rerender;
- `usePolicy` evaluates a policy requiring one scope and a policy requiring both scopes;
- `usePolicy` and `useGrantContext` throw a message containing `PolicyProvider` when rendered without the provider;
- resolved empty grants remain distinguishable from `unresolved` through `useGrantContext`.

- [ ] **Step 3: Run the tests and verify RED**

Run:

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand
```

Expected: FAIL because `createReactPolicyContext`, its provider, and hooks do not exist.

- [ ] **Step 4: Implement the minimal types and root context**

Define the central mapped type:

```ts
export type RegistryGrantContext<Reg extends GenericRegistry> = {
  readonly [Scope in Extract<keyof Reg['modules'], string>]: GrantState<
    Extract<ModulePermissions<Reg['modules'][Scope]>, string>
  >;
};
```

Define compatibility so a full registry context must satisfy every context property required by a policy:

```ts
export type CompatiblePolicy<FullContext, PolicyContext> =
  FullContext extends PolicyContext ? PolicyEvaluator<PolicyContext> : never;
```

`createReactPolicyContext(registry)` creates `React.createContext<FullContext | null>(null)`. `PolicyProvider` builds a fresh full context from `Object.keys(registry.modules)` and the current partial `grants`, using `unresolved` whenever a key is absent. Memoize from the `grants` object identity. A private consumer hook throws `Error('Policy context is missing. Wrap this subtree in PolicyProvider.')` on `null`.

Implement:

```ts
function useGrantContext(): FullContext;
function usePolicy<PolicyContext>(
  policy: PolicyEvaluator<PolicyContext> & (FullContext extends PolicyContext ? unknown : never),
): boolean;
```

Use this runtime structure, keeping the raw context private to package composition:

```tsx
function createRootContext<Reg extends GenericRegistry>(
  registry: Reg,
  grants: Partial<RegistryGrantContext<Reg>>,
): RegistryGrantContext<Reg> {
  const scopeNames = Object.keys(registry.modules) as Array<
    Extract<keyof Reg['modules'], string>
  >;
  return Object.fromEntries(
    scopeNames.map((scope) => [scope, grants[scope] ?? unresolved]),
  ) as RegistryGrantContext<Reg>;
}

export function createReactPolicyContext<Reg extends GenericRegistry>(registry: Reg) {
  type FullContext = RegistryGrantContext<Reg>;
  const Context = React.createContext<FullContext | null>(null);

  function useGrantContext(): FullContext {
    const context = React.useContext(Context);
    if (context === null) {
      throw new Error('Policy context is missing. Wrap this subtree in PolicyProvider.');
    }
    return context;
  }

  function usePolicy<PolicyContext>(
    policy: PolicyEvaluator<PolicyContext> &
      (FullContext extends PolicyContext ? unknown : never),
  ): boolean {
    return policy(useGrantContext());
  }

  function PolicyProvider({
    grants,
    children,
  }: React.PropsWithChildren<{ readonly grants: Partial<FullContext> }>) {
    const value = React.useMemo(
      () => createRootContext(registry, grants),
      [grants],
    );
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  return { Context, PolicyProvider, useGrantContext, usePolicy };
}
```

`Context` is returned only for composition by the other internal factories and is never re-exported from the package entry point.

Keep `createReactPolicyContext` internal and import it directly from the relative module in package tests. `src/index.ts` must not expose a temporary public factory; Task 5 creates the final public `createReactPolicy` composition.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand
pnpm exec tsc -b packages/rbac-react/tsconfig.json
```

Expected: PASS with no warnings or TypeScript errors.

- [ ] **Step 6: Refactor while green**

Extract root-context construction into a small pure function if the provider body cannot be understood independently. Do not introduce boundary strategies yet. Re-run both commands from Step 5.

- [ ] **Step 7: Commit the independently working root context**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json nx.json packages/rbac-react
git commit -m "feat(rbac-react): add root policy context"
```

---

### Task 2: Implement declarative policy boundaries

**Files:**

- Create: `packages/rbac-react/src/lib/policy-boundary.test.tsx`
- Create: `packages/rbac-react/src/lib/policy-boundary.tsx`
- Create: `packages/rbac-react/src/lib/types.type-test.tsx`
- Modify: `packages/rbac-react/src/lib/types.ts`
- Modify: `packages/rbac-react/src/lib/react-policy-context.tsx`
- Modify: `packages/rbac-react/src/index.ts`

**Interfaces:**

- Consumes: the private context consumer and `RegistryGrantContext<Reg>` from Task 1.
- Produces: `BoundaryStrategy`, `BoundaryDefaultStrategy`, `PolicyBoundaryConfig<Reg>`, `PolicyBoundaryGrants<Reg, Config>`, and `createPolicyBoundary(config)`.

- [ ] **Step 1: Write runtime boundary tests**

Cover one behavior per test:

- explicit `inherit` preserves a parent scope;
- explicit `provide` replaces a parent scope;
- explicit `reset` replaces a parent scope with `unresolved`;
- `default: 'inherit'` applies to every omitted scope;
- `default: 'reset'` protects omitted scopes from inherited values;
- `provide` accepts an explicit `unresolved`;
- nested boundaries combine values for a multi-scope policy;
- a boundary outside `PolicyProvider` throws;
- an unknown runtime scope, invalid strategy, or missing provided grant throws a diagnostic error.

- [ ] **Step 2: Write compile-time boundary tests**

Use literal configs with `as const` and `@ts-expect-error` assertions. Include:

```tsx
const DocumentBoundary = createPolicyBoundary({
  default: 'reset',
  scopes: { account: 'inherit', document: 'provide' },
} as const);

<DocumentBoundary grants={{ document: resolved([DocumentGrant.READ]) }} />;

// @ts-expect-error document is required because its strategy is provide
<DocumentBoundary grants={{}} />;

// @ts-expect-error account is inherited and cannot be supplied
<DocumentBoundary grants={{ account: resolved([AccountGrant.ADMIN]), document: unresolved }} />;
```

Also assert rejection of an unknown scope and rejection of `default: 'provide'`.

- [ ] **Step 3: Run tests and typecheck to verify RED**

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand
pnpm exec tsc -b packages/rbac-react/tsconfig.json
```

Expected: FAIL because boundary types and runtime implementation are absent; typecheck must also report unused or unsatisfied expectation sites until the constraints exist.

- [ ] **Step 4: Implement boundary strategy inference**

Use a required default limited to `inherit | reset`:

```ts
export type BoundaryStrategy = 'inherit' | 'provide' | 'reset';
export type BoundaryDefaultStrategy = Exclude<BoundaryStrategy, 'provide'>;

export interface PolicyBoundaryConfig<Reg extends GenericRegistry> {
  readonly default: BoundaryDefaultStrategy;
  readonly scopes?: Partial<Record<Extract<keyof Reg['modules'], string>, BoundaryStrategy>>;
}
```

Infer each scope's effective strategy from the explicit entry or default. Build `PolicyBoundaryGrants` as the intersection of:

- required properties for effective `provide` scopes;
- optional `never` properties for every known non-`provide` scope.

The optional-`never` half is required so known registry scopes cannot leak into `grants` through variables, not only through fresh object-literal excess-property checking.

Use this type shape for strategy lookup and boundary grants:

```ts
type ScopeKey<Reg extends GenericRegistry> = Extract<keyof Reg['modules'], string>;

type StrategyFor<
  Config extends PolicyBoundaryConfig<any>,
  Scope extends PropertyKey,
> = Config extends { readonly scopes: infer Strategies }
  ? Scope extends keyof Strategies
    ? Strategies[Scope]
    : Config['default']
  : Config['default'];

export type PolicyBoundaryGrants<
  Reg extends GenericRegistry,
  Config extends PolicyBoundaryConfig<Reg>,
> = {
  readonly [Scope in ScopeKey<Reg> as StrategyFor<Config, Scope> extends 'provide'
    ? Scope
    : never]-?: RegistryGrantContext<Reg>[Scope];
} & {
  readonly [Scope in ScopeKey<Reg> as StrategyFor<Config, Scope> extends 'provide'
    ? never
    : Scope]?: never;
};
```

- [ ] **Step 5: Implement normalized boundary resolution**

At `createPolicyBoundary(config)` time:

1. enumerate registry keys;
2. validate every configured key against the registry;
3. validate each runtime strategy;
4. create an immutable normalized strategy map for all registry keys.

At render time, read the parent context, verify every normalized `provide` key is an own property of `grants`, and compute the next full context according to the normalized map. Memoize the value from parent context and `grants` identity. Do not mutate the parent or caller-owned values.

Keep the resolver exhaustive and explicit:

```ts
for (const scope of scopeNames) {
  switch (strategies[scope]) {
    case 'inherit':
      next[scope] = parent[scope];
      break;
    case 'provide':
      if (!Object.prototype.hasOwnProperty.call(grants, scope)) {
        throw new Error(`Policy boundary must provide grants for scope "${scope}".`);
      }
      next[scope] = grants[scope];
      break;
    case 'reset':
      next[scope] = unresolved;
      break;
  }
}
```

- [ ] **Step 6: Run focused tests and typecheck to verify GREEN**

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand
pnpm exec tsc -b packages/rbac-react/tsconfig.json
```

Expected: PASS. Remove no `@ts-expect-error`; each one must be consumed by the intended type failure.

- [ ] **Step 7: Refactor while green**

Keep configuration normalization and per-render resolution as separate pure functions. Re-run the Task 2 test file and TypeScript build after refactoring.

- [ ] **Step 8: Commit the boundary capability**

```bash
git add packages/rbac-react/src
git commit -m "feat(rbac-react): add declarative policy boundaries"
```

---

### Task 3: Implement `PolicyGate`

**Files:**

- Create: `packages/rbac-react/src/lib/policy-gate.test.tsx`
- Create: `packages/rbac-react/src/lib/policy-gate.tsx`
- Modify: `packages/rbac-react/src/lib/react-policy-context.tsx`
- Modify: `packages/rbac-react/src/index.ts`

**Interfaces:**

- Consumes: the exact `usePolicy` function created by the same registry factory.
- Produces: a registry-bound `PolicyGate` that accepts a ready compatible policy, children, and an optional fallback.

- [ ] **Step 1: Write failing gate tests**

Test separately that:

- allowed policy renders children and not fallback;
- denied policy renders fallback and not children;
- omitted fallback renders nothing;
- context updates switch the rendered branch;
- usage outside `PolicyProvider` throws the missing-provider error;
- an exception thrown by a policy propagates rather than becoming denial.

- [ ] **Step 2: Run the gate tests and verify RED**

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand --testPathPatterns=policy-gate
```

Expected: FAIL because `PolicyGate` is not returned by the factory.

- [ ] **Step 3: Implement the minimal gate factory**

Define props around a ready evaluator:

```ts
export interface PolicyGateProps<FullContext, PolicyContext> {
  readonly policy: PolicyEvaluator<PolicyContext> &
    (FullContext extends PolicyContext ? unknown : never);
  readonly children?: React.ReactNode;
  readonly fallback?: React.ReactNode;
}
```

Create the registry-bound generic component inside the factory composition. It calls the same `usePolicy` hook and returns a fragment containing `children` when allowed or `fallback ?? null` when denied. Do not add builder callbacks, render props, loading props, or error handling.

The implementation body remains deliberately small:

```tsx
function PolicyGate<PolicyContext>({
  policy,
  children,
  fallback = null,
}: PolicyGateProps<FullContext, PolicyContext>) {
  return <>{usePolicy(policy) ? children : fallback}</>;
}
```

- [ ] **Step 4: Run focused and full package tests to verify GREEN**

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand --testPathPatterns=policy-gate
pnpm exec nx test @levi2ki/rbac-react --runInBand
```

Expected: PASS with no swallowed policy exceptions or React warnings.

- [ ] **Step 5: Commit the gate**

```bash
git add packages/rbac-react/src
git commit -m "feat(rbac-react): add policy gate"
```

---

### Task 4: Implement the ref-transparent `withPolicy` HOC

**Files:**

- Create: `packages/rbac-react/src/lib/with-policy.test.tsx`
- Create: `packages/rbac-react/src/lib/with-policy.tsx`
- Modify: `packages/rbac-react/src/lib/types.type-test.tsx`
- Modify: `packages/rbac-react/src/lib/react-policy-context.tsx`
- Modify: `packages/rbac-react/src/index.ts`

**Interfaces:**

- Consumes: `createPolicyBoundary(config)` and `PolicyBoundaryGrants<Reg, Config>` from Task 2.
- Produces: `withPolicy(config)(WrappedComponent)` with original props and ref plus one consumed policy `grants` prop.

- [ ] **Step 1: Write failing HOC behavior tests**

Wrap a `forwardRef<HTMLButtonElement, { label: string }>` fixture and verify:

- the label prop reaches the original component;
- the outer `grants` prop is absent from received original props;
- `ref.current` is the original button element;
- the wrapped subtree reads the boundary-provided scope;
- inherited and reset scopes behave exactly as with the direct boundary;
- `displayName` includes the original display name.

- [ ] **Step 2: Add failing HOC type assertions**

Assert that the wrapped component requires the inferred `provide` grants and retains all original required props. Add an explicit rejected fixture:

```tsx
function ConflictingComponent(_props: { grants: string; label: string }) {
  return null;
}

// @ts-expect-error withPolicy reserves and consumes the grants prop
withPolicy(config)(ConflictingComponent);
```

Also verify the returned component accepts the original ref type and rejects an unrelated ref type.

- [ ] **Step 3: Run behavior tests and typecheck to verify RED**

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand --testPathPatterns=with-policy
pnpm exec tsc -b packages/rbac-react/tsconfig.json
```

Expected: FAIL because `withPolicy` and its type-level conflict protection do not exist.

- [ ] **Step 4: Implement the HOC as boundary composition**

`withPolicy(config)` must call `createPolicyBoundary(config)` once and return a component wrapper built with React `forwardRef`. Infer original props with `ComponentPropsWithoutRef<Component>` and the target ref with `ComponentRef<Component>`.

The wrapper performs only this composition:

```tsx
<Boundary grants={grants}>
  <WrappedComponent {...originalProps} ref={ref} />
</Boundary>
```

Use an internal type assertion only at the JSX spread boundary where TypeScript cannot preserve subtraction across a generic component. Do not weaken the public signature with `any`. Reject components containing a `grants` key by making the wrapped-component parameter `never` in that branch. Set `displayName` without copying arbitrary static properties.

Use this public-signature shape:

```ts
type RejectGrantsProp<Component extends React.ElementType> =
  'grants' extends keyof React.ComponentPropsWithoutRef<Component>
    ? never
    : Component;

function wrap<Component extends React.ElementType>(
  WrappedComponent: RejectGrantsProp<Component>,
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<
    React.ComponentPropsWithoutRef<Component> & {
      readonly grants: PolicyBoundaryGrants<Reg, Config>;
    }
  > & React.RefAttributes<React.ComponentRef<Component>>
>;
```

- [ ] **Step 5: Run focused tests, full tests, and typecheck to verify GREEN**

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand --testPathPatterns=with-policy
pnpm exec nx test @levi2ki/rbac-react --runInBand
pnpm exec tsc -b packages/rbac-react/tsconfig.json
```

Expected: PASS with the ref pointing to the original target and all negative type assertions consumed.

- [ ] **Step 6: Commit the HOC**

```bash
git add packages/rbac-react/src
git commit -m "feat(rbac-react): add policy boundary HOC"
```

---

### Task 5: Finalize the ESM package and public contract

**Files:**

- Create: `packages/rbac-react/rollup.config.cjs`
- Modify: `packages/rbac-react/package.json`
- Modify: `packages/rbac-react/src/index.ts`
- Modify: `packages/rbac-react/tsconfig.lib.json`
- Modify: `packages/rbac-react/README.md`

**Interfaces:**

- Consumes: all runtime factories and public types from Tasks 1-4.
- Produces: the final `createReactPolicy(registry)` API and published ESM entry point.

- [ ] **Step 1: Write a failing public-entry type test**

Change `types.type-test.tsx` to import only from `@levi2ki/rbac-react`, then exercise:

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

Keep every positive and negative assertion from earlier tasks. This must be a consumer view: do not import private files.

- [ ] **Step 2: Run typecheck and verify RED**

```bash
pnpm exec tsc -b packages/rbac-react/tsconfig.json
```

Expected: FAIL until the public entry point exports the complete factory and public types.

- [ ] **Step 3: Compose and export the final factory**

`createReactPolicy(registry)` creates the context primitives once, passes their private consumer into the boundary factory, constructs `PolicyGate` from the exact `usePolicy`, and constructs `withPolicy` from the exact `createPolicyBoundary`. Return exactly:

```ts
{
  PolicyProvider,
  PolicyGate,
  usePolicy,
  useGrantContext,
  createPolicyBoundary,
  withPolicy,
}
```

Export `createReactPolicy` plus consumer-useful types from `src/index.ts`. Do not export the raw React context, normalization helpers, resolution helpers, or test fixtures.

- [ ] **Step 4: Add the ESM-only Rollup configuration**

Emit only `dist/index.esm.js` and declarations rooted at `dist/index.d.ts`. Clean `dist` at build start. Configure these exact externals:

```js
const fs = require('fs');
const path = require('path');

const cleanDist = () => ({
  name: 'clean-dist',
  buildStart() {
    fs.rmSync(path.resolve(__dirname, 'dist'), { recursive: true, force: true });
  },
});

module.exports = {
  input: path.resolve(__dirname, 'src/index.ts'),
  output: [{ file: 'dist/index.esm.js', format: 'esm', sourcemap: false }],
  external: [
    'react',
    'react/jsx-runtime',
    '@levi2ki/rbac-core',
    '@levi2ki/rbac-expression',
  ],
  plugins: [
    cleanDist(),
    require('@rollup/plugin-commonjs')(),
    require('@rollup/plugin-typescript')({
      tsconfig: path.resolve(__dirname, 'tsconfig.lib.json'),
      declaration: true,
    }),
  ],
};
```

Do not emit a CommonJS file. Ensure `package.json` has no `main` field pointing to a nonexistent or ambiguous CJS artifact.

- [ ] **Step 5: Run typecheck, tests, and build to verify GREEN**

```bash
pnpm exec tsc -b
pnpm exec nx test @levi2ki/rbac-react --runInBand
pnpm exec nx build @levi2ki/rbac-react
test -f packages/rbac-react/dist/index.esm.js
test -f packages/rbac-react/dist/index.d.ts
test ! -f packages/rbac-react/dist/index.js
```

Expected: every command exits zero and the file assertions confirm the ESM-only artifact set.

- [ ] **Step 6: Verify the built public package as a consumer**

Run a Node ESM import after the build:

```bash
node --input-type=module -e "import('@levi2ki/rbac-react').then((m) => { if (typeof m.createReactPolicy !== 'function') process.exit(1) })"
```

Expected: exit zero. Inspect `dist/index.esm.js` and confirm workspace package and React code were not inlined; imports must remain external.

- [ ] **Step 7: Commit the package output contract**

```bash
git add packages/rbac-react
git commit -m "build(rbac-react): publish ESM package"
```

---

### Task 6: Document the adapter with obfuscated migration examples

**Files:**

- Modify: `packages/rbac-react/README.md`
- Modify: `README.md`

**Interfaces:**

- Consumes: the completed public API from Task 5.
- Produces: repository and package documentation that teaches the supported architecture without exposing reference-project vocabulary.

- [ ] **Step 1: Write the package README**

Use only neutral examples such as `account`, `workspace`, and `document`, with grants such as `ADMIN`, `READ`, and `EDIT`. Include runnable snippets for:

- `createReactPolicy(registry)`;
- partial root initialization;
- an isolated boundary using `default: 'reset'`;
- an open boundary using `default: 'inherit'`;
- `usePolicy` versus `useGrantContext`;
- `PolicyGate` with fallback;
- `withPolicy` with a consumed `grants` prop and forwarded ref;
- `resolved([])` versus `unresolved`;
- application-owned loading and request errors;
- the registry-wide rerender trade-off and React Profiler measurements.

Add a migration section expressed structurally:

```text
scope-specific providers -> one root provider plus boundaries
predeclared multi-scope composers -> ordinary reusable multi-scope policies
builder callbacks in guards -> ready policies passed to PolicyGate
permission arrays used for loading -> explicit GrantState values
```

Do not include the private reference project's name, links, repository or filesystem paths, routes, grants, entity terminology, source structure, or component identifiers.

- [ ] **Step 2: Update the root README package list and example flow**

Add `@levi2ki/rbac-react` after the expression package. Keep the root product boundary explicit: adapters sit above expressions and backend authorization remains authoritative.

- [ ] **Step 3: Verify documentation examples**

Move any nontrivial README snippets into or mirror them in compile-time tests so they are checked by:

```bash
pnpm exec tsc -b packages/rbac-react/tsconfig.json
```

Run a documentation leak scan for absolute paths and links:

```bash
rg -n "/Users/|file://|https?://" packages/rbac-react/README.md README.md
```

Expected: the TypeScript command passes and the scan returns no paths or links. Compare every migration identifier and example against the private reference source during review; no source-specific name or recognizable domain term may remain.

- [ ] **Step 4: Commit documentation**

```bash
git add packages/rbac-react/README.md README.md packages/rbac-react/src/lib/types.type-test.tsx
git commit -m "docs(rbac-react): document React adapter usage"
```

---

### Task 7: Add React 18 and React 19 compatibility verification

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `packages/rbac-react/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: the public package tests and build commands from Tasks 1-6.
- Produces: repeatable CI evidence for both supported React major versions.

- [ ] **Step 1: Verify the peer range before adding CI configuration**

Run:

```bash
node -e "const p=require('./packages/rbac-react/package.json'); if(p.peerDependencies.react !== '^18.2.0 || ^19.0.0') process.exit(1)"
```

Expected: exit zero. This is configuration verification rather than production behavior, so the TDD exception for configuration applies.

- [ ] **Step 2: Add the compatibility matrix job**

Add a separate CI job with matrix values `'18'` and `'19'`. Each isolated matrix run must:

1. check out the repository;
2. install pnpm 9.15.0 and Node 20;
3. run the frozen workspace install;
4. replace only the ephemeral `rbac-react` development React packages with the matrix major using `pnpm add --filter @levi2ki/rbac-react --save-dev --lockfile=false react@${{ matrix.react }} react-dom@${{ matrix.react }} @types/react@${{ matrix.react }} @types/react-dom@${{ matrix.react }}`;
5. run `pnpm exec tsc -b packages/rbac-react/tsconfig.json`;
6. run `pnpm exec nx test @levi2ki/rbac-react --runInBand`;
7. run `pnpm exec nx build @levi2ki/rbac-react`.

Do not change the existing repository-wide CI commands as part of this feature.

Add this sibling job under `jobs`:

```yaml
  rbac-react-compatibility:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        react: ['18', '19']
    steps:
      - uses: actions/checkout@v4
        with:
          filter: tree:0
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Select React ${{ matrix.react }}
        run: pnpm add --filter @levi2ki/rbac-react --save-dev --lockfile=false react@${{ matrix.react }} react-dom@${{ matrix.react }} @types/react@${{ matrix.react }} @types/react-dom@${{ matrix.react }}
      - name: Typecheck React adapter
        run: pnpm exec tsc -b packages/rbac-react/tsconfig.json
      - name: Test React adapter
        run: pnpm exec nx test @levi2ki/rbac-react --runInBand
      - name: Build React adapter
        run: pnpm exec nx build @levi2ki/rbac-react
```

- [ ] **Step 3: Run the local React 19 verification to reach GREEN**

```bash
pnpm exec nx test @levi2ki/rbac-react --runInBand
pnpm exec tsc -b packages/rbac-react/tsconfig.json
pnpm exec nx build @levi2ki/rbac-react
```

Expected: PASS against the workspace's React 19 development dependency. React 18 is verified by the matrix job using the same committed tests and source.

- [ ] **Step 4: Commit compatibility verification**

```bash
git add .github/workflows/ci.yml packages/rbac-react/package.json pnpm-lock.yaml packages/rbac-react/src
git commit -m "test(rbac-react): verify React version compatibility"
```

---

### Task 8: Run final repository verification

**Files:**

- Modify only files required to fix failures caused by Tasks 1-7.

**Interfaces:**

- Consumes: the complete adapter package, tests, build contract, and documentation.
- Produces: verified repository state ready for whole-branch review.

- [ ] **Step 1: Run the complete verification suite**

```bash
pnpm exec tsc -b
pnpm exec nx test @levi2ki/rbac-core --runInBand
pnpm exec nx test @levi2ki/rbac-expression --runInBand
pnpm exec nx test @levi2ki/rbac-react --runInBand
pnpm exec nx build @levi2ki/rbac-core
pnpm exec nx build @levi2ki/rbac-expression
pnpm exec nx build @levi2ki/rbac-react
pnpm exec nx lint @levi2ki/rbac-react
```

Expected: all commands exit zero with no test failures, build failures, type errors, or lint errors.

- [ ] **Step 2: Verify scope and generated-output hygiene**

```bash
git status --short
git diff --check main...HEAD
git diff --stat main...HEAD
```

Confirm that `dist/`, `tmp/`, `.nx/`, `out-tsc/`, and `test-output/` are not tracked and that no reference-project source or product identifiers were copied.

- [ ] **Step 3: Request whole-branch review**

Use `superpowers:requesting-code-review` against the merge base and current HEAD. The reviewer must check the approved spec, public type safety, context leak prevention, Rules of Hooks compliance, React 18/19 compatibility, ESM packaging, test quality, and documentation obfuscation.

- [ ] **Step 4: Resolve review findings and re-run verification**

Fix every Critical or Important finding through its own RED -> GREEN cycle, then repeat Steps 1 and 2. Record Minor findings explicitly for the final handoff.

- [ ] **Step 5: Finish the development branch**

After fresh green verification, invoke `superpowers:finishing-a-development-branch` and present the required integration options. Do not merge, push, or discard without the user's explicit choice.

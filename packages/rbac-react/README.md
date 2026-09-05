# @levi2ki/rbac-react

React 18 and 19 bindings for typed, grant-based policy expressions. This
package is an adapter layer: it owns React context and rendering integration,
while `@levi2ki/rbac-expression` continues to own policy evaluation.

The adapter does not load grants, identify an account, or decide whether a
request succeeded. Those remain application concerns. Backend authorization is
still authoritative.

## Create an adapter for a registry

Build the grant registry and policy expressions as usual, then create one React
adapter for that registry. The returned APIs are all bound to the registry, so
their scopes and grants stay type-safe.

```tsx
import * as React from 'react';
import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import { createExpression, resolved, unresolved } from '@levi2ki/rbac-expression';
import { createReactPolicy } from '@levi2ki/rbac-react';

enum AccountGrant {
  ADMIN = 'ADMIN',
}

enum WorkspaceGrant {
  READ = 'READ',
}

enum DocumentGrant {
  READ = 'READ',
  EDIT = 'EDIT',
}

const registry = register(createModule<DocumentGrant>()('document'))(
  register(createModule<WorkspaceGrant>()('workspace'))(
    register(createModule<AccountGrant>()('account'))(getDefaultRegistry()),
  ),
);

const { has, and } = createExpression(registry);
const canReadDocument = has('document.READ');
const canReadWorkspaceDocument = and([
  has('workspace.READ'),
  canReadDocument,
]);

const {
  PolicyProvider,
  PolicyGate,
  usePolicy,
  useGrantContext,
  createPolicyBoundary,
  withPolicy,
} = createReactPolicy(registry);
```

`createReactPolicy(registry)` is the package entry point. It returns these
public APIs:

- `PolicyProvider` supplies the root runtime grant context.
- `usePolicy(policy)` evaluates a ready expression against that context.
- `useGrantContext()` reads the complete, typed grant-state context.
- `PolicyGate` conditionally renders a policy's children or fallback.
- `createPolicyBoundary(config)` creates a scoped context boundary.
- `withPolicy(config)` wraps a component in a boundary while preserving its ref.

The package also exports `RegistryGrantContext`, `PolicyBoundaryConfig`,
`PolicyBoundaryGrants`, `BoundaryStrategy`, `BoundaryDefaultStrategy`,
`CompatiblePolicy`, and `PolicyGateProps` for code that needs explicit types.

## Root context and hooks

Root initialization is intentionally partial. Scopes omitted from `grants` are
filled with `unresolved`, which lets an application render before every grant
source is ready.

```tsx
function DocumentControls() {
  const canRead = usePolicy(canReadDocument);
  const grantContext = useGrantContext();

  if (grantContext.document.kind === 'unresolved') {
    return <p>Loading document access…</p>;
  }

  return canRead ? <button>Open document</button> : null;
}

<PolicyProvider grants={{ account: resolved([AccountGrant.ADMIN]) }}>
  <DocumentControls />
</PolicyProvider>;
```

In this example, `workspace` and `document` are `unresolved`. Use
`usePolicy` when a component only needs a boolean decision. Use
`useGrantContext` when it must inspect a scope's loading state or use a typed
grant context for another purpose.

`resolved([])` and `unresolved` are deliberately different states:

```ts
const knownEmptyDocument = resolved<DocumentGrant>([]);
const documentNotLoaded = unresolved;
```

`resolved([])` means access is known and the set is empty. `unresolved` means
the set is not currently available. Expressions deny conservatively for an
unresolved scope, so applications should show their own loading UI when that
distinction matters.

Loading and request failures are application-owned state, not adapter state.
For example, keep a transport error separate from the grants that successfully
arrived:

```tsx
import type { RegistryGrantContext } from '@levi2ki/rbac-react';

type DocumentAccessLoad =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly grants: Partial<RegistryGrantContext<typeof registry>>;
    };

function DocumentAccessRoot({ access }: { readonly access: DocumentAccessLoad }) {
  if (access.status === 'loading') return <p>Loading access…</p>;
  if (access.status === 'error') return <p>{access.message}</p>;

  return <PolicyProvider grants={access.grants}><DocumentControls /></PolicyProvider>;
}
```

Do not use `unresolved` to mean a failed request: it means only that a scope
has not been resolved. The application chooses retry, error presentation, and
when to replace a prior context.

## Boundaries

A boundary sets the grant state visible below it. Its `default` applies to every
registry scope not listed in `scopes`; each listed scope can override it with
`inherit`, `provide`, or `reset`. A boundary default can only be `inherit` or
`reset` because `provide` requires a grant value for a known scope.

An isolated document boundary resets every scope except the one it explicitly
receives. This is useful where an inner tree must not observe account or
workspace context from its parent.

```tsx
const IsolatedDocumentBoundary = createPolicyBoundary({
  default: 'reset',
  scopes: { document: 'provide' },
} as const);

<PolicyProvider grants={{ workspace: resolved([WorkspaceGrant.READ]) }}>
  <IsolatedDocumentBoundary grants={{ document: resolved([DocumentGrant.READ]) }}>
    <DocumentControls />
  </IsolatedDocumentBoundary>
</PolicyProvider>;
```

Below `IsolatedDocumentBoundary`, `account` and `workspace` are `unresolved`;
only `document` has the supplied state. The boundary itself is nested in a root
provider because it has a parent context to transform.

An open boundary inherits every unlisted scope and replaces only `document`:

```tsx
const OpenDocumentBoundary = createPolicyBoundary({
  default: 'inherit',
  scopes: { document: 'provide' },
} as const);

<PolicyProvider grants={{
  account: resolved([AccountGrant.ADMIN]),
  workspace: resolved([WorkspaceGrant.READ]),
}}>
  <OpenDocumentBoundary grants={{ document: resolved([DocumentGrant.EDIT]) }}>
    <DocumentControls />
  </OpenDocumentBoundary>
</PolicyProvider>;
```

The type of `grants` requires every `provide` scope and rejects `inherit` and
`reset` scopes. That prevents a caller from accidentally supplying a state that
the boundary will not use.

## Rendering policies

`PolicyGate` is the direct declarative form. It renders `children` only when
the policy returns `true`; otherwise it renders `fallback`, which defaults to
`null`.

```tsx
<PolicyGate policy={canReadWorkspaceDocument} fallback={<p>Document unavailable</p>}>
  <button>Open document</button>
</PolicyGate>;
```

`withPolicy` is the component form. It creates a boundary from its config,
consumes the resulting `grants` prop, and forwards the wrapped component's ref.
The wrapped component must not already declare a `grants` prop because that name
belongs to the boundary.

```tsx
const DocumentButton = React.forwardRef<HTMLButtonElement, { readonly label: string }>(
  ({ label }, ref) => <button ref={ref}>{label}</button>,
);

const SecuredDocumentButton = withPolicy({
  default: 'reset',
  scopes: { document: 'provide' },
} as const)(DocumentButton);

const buttonRef = React.createRef<HTMLButtonElement>();

<SecuredDocumentButton
  label="Save document"
  grants={{ document: resolved([DocumentGrant.EDIT]) }}
  ref={buttonRef}
/>;
```

`grants` configures the boundary and is not forwarded to `DocumentButton`.
`label` remains required, and `buttonRef` retains the `HTMLButtonElement` ref
type from the original component.

## Rendering cost

The root context is registry-wide: when the `grants` prop changes identity,
every descendant that reads the policy context may rerender. This simple model
keeps a complete typed context available to every policy, but it is a trade-off
for frequently changing, large grant contexts.

Measure the actual tree with the React Profiler before optimizing. Record
commits and render durations while changing representative account, workspace,
and document grants. If the measurements show a problem, keep root `grants`
references stable when values have not changed, move independent subtrees behind
boundaries, or split a tree at an application-owned composition point. Do not
assume that more providers are faster without profiler evidence.

## Structural migration

When moving an existing React integration to this adapter, translate the shape
of the integration rather than carrying over provider-specific helpers:

```text
scope-specific providers -> one root provider plus boundaries
predeclared multi-scope composers -> ordinary reusable multi-scope policies
builder callbacks in guards -> ready policies passed to PolicyGate
permission arrays used for loading -> explicit GrantState values
```

The reusable policies remain in the expression layer. React components choose
where runtime grant state enters the tree and where its boundaries belong.

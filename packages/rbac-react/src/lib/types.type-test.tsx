import * as React from 'react';

import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import { createExpression, resolved, unresolved } from '@levi2ki/rbac-expression';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Verify the public package contract as a consumer.
import { createReactPolicy, type PolicyBoundaryConfig, type RegistryGrantContext } from '@levi2ki/rbac-react';

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

const testRegistry = register(createModule<DocumentGrant>()('document'))(
  register(createModule<WorkspaceGrant>()('workspace'))(
    register(createModule<AccountGrant>()('account'))(getDefaultRegistry()),
  ),
);
const {
  PolicyProvider,
  PolicyGate,
  usePolicy,
  useGrantContext,
  createPolicyBoundary,
  withPolicy,
} = createReactPolicy(testRegistry);
const { has, not, and, or } = createExpression(testRegistry);
const canReadDocument = has('document.READ');
const canReadWorkspaceDocument = and([has('workspace.READ'), canReadDocument]);
const canEditDocument = or([
  has('account.ADMIN'),
  has('workspace.READ'),
  and([
    has('document.EDIT'),
    not('document.READ'),
  ]),
]);
const foreignRegistry = register(createModule<'read'>()('foreign'))(getDefaultRegistry());
const foreignPolicy = createExpression(foreignRegistry).has('foreign.read');

function DocumentControls() {
  const context: RegistryGrantContext<typeof testRegistry> = useGrantContext();
  const documentAllowed: boolean = usePolicy(canReadDocument);
  // @ts-expect-error policies requiring an unknown scope are incompatible
  usePolicy(foreignPolicy);

  if (context.document.kind === 'unresolved') {
    return <p>Loading document access…</p>;
  }

  return documentAllowed ? <button>Open document</button> : null;
}

const emptyDocument: RegistryGrantContext<typeof testRegistry>['document'] = resolved([]);
const loadingDocument: RegistryGrantContext<typeof testRegistry>['document'] = unresolved;
const rootExampleGrants: RegistryGrantContext<typeof testRegistry> = {
  account: resolved([AccountGrant.ADMIN]),
  workspace: unresolved,
  document: resolved([DocumentGrant.EDIT]),
};
void emptyDocument;
void loadingDocument;
void canEditDocument(rootExampleGrants);

<PolicyProvider grants={{ account: resolved([AccountGrant.ADMIN]) }}><DocumentControls /></PolicyProvider>;
<PolicyGate policy={canReadDocument} />;
<PolicyGate policy={canReadWorkspaceDocument} fallback={<p>Document unavailable</p>}>
  <button>Open document</button>
</PolicyGate>;

type DocumentAccessLoad =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly grants: Partial<RegistryGrantContext<typeof testRegistry>>;
    };

function DocumentAccessRoot({ access }: { readonly access: DocumentAccessLoad }) {
  if (access.status === 'loading') return <p>Loading access…</p>;
  if (access.status === 'error') return <p>{access.message}</p>;

  return <PolicyProvider grants={access.grants}><DocumentControls /></PolicyProvider>;
}

void DocumentAccessRoot;

// @ts-expect-error root grants are restricted to registry scopes
<PolicyProvider grants={{ foreign: unresolved }} />;

// @ts-expect-error grants are restricted to the declared vocabulary
<PolicyProvider grants={{ document: resolved(['DELETE']) }} />;

// @ts-expect-error gates reject policies requiring an unknown scope
<PolicyGate policy={foreignPolicy} />;

const IsolatedDocumentBoundary = createPolicyBoundary({
  default: 'reset',
  scopes: { document: 'provide' },
} as const);

// @ts-expect-error known scope keys must not hide an unknown scope
createPolicyBoundary({ default: 'reset', scopes: { document: 'provide', foreign: 'reset' } });

// @ts-expect-error the HOC applies the same closed scope contract
withPolicy({ default: 'reset', scopes: { document: 'provide', foreign: 'reset' } });

const broadPolicyConfig: PolicyBoundaryConfig<typeof testRegistry> = {
  default: 'reset',
  scopes: { document: 'provide' },
};
const BroadDocumentBoundary = createPolicyBoundary(broadPolicyConfig);

// @ts-expect-error a broad config must not permit missing provide grants
<BroadDocumentBoundary grants={{}} />;

<BroadDocumentBoundary grants={rootExampleGrants} />;

<PolicyProvider grants={{ workspace: resolved([WorkspaceGrant.READ]) }}>
  <IsolatedDocumentBoundary grants={{ document: resolved([DocumentGrant.READ]) }}>
    <DocumentControls />
  </IsolatedDocumentBoundary>
</PolicyProvider>;

// @ts-expect-error document is required because its strategy is provide
<IsolatedDocumentBoundary grants={{}} />;

const grantsWithResetScope = {
  workspace: resolved([WorkspaceGrant.READ]),
  document: unresolved,
};

// @ts-expect-error reset scopes cannot be supplied, including through variables
<IsolatedDocumentBoundary grants={grantsWithResetScope} />;

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

const grantsWithInheritedScope = {
  account: resolved([AccountGrant.ADMIN]),
  document: unresolved,
};

// @ts-expect-error inherited scopes cannot be supplied, including through variables
<OpenDocumentBoundary grants={grantsWithInheritedScope} />;

createPolicyBoundary({
  default: 'reset',
  scopes: {
    // @ts-expect-error registry scopes are closed
    unknown: 'provide',
  },
} as const);

createPolicyBoundary({
  // @ts-expect-error provide is invalid as a boundary default
  default: 'provide',
} as const);

const policyConfig = {
  default: 'reset',
  scopes: { document: 'provide' },
} as const;

const DocumentButton = React.forwardRef<HTMLButtonElement, { readonly label: string }>(
  ({ label }, ref) => <button ref={ref}>{label}</button>,
);
const SecuredDocumentButton = withPolicy(policyConfig)(DocumentButton);
const BroadSecuredDocumentButton = withPolicy(broadPolicyConfig)(DocumentButton);

// @ts-expect-error the HOC also requires grants for scopes that may provide
<BroadSecuredDocumentButton label="Save document" grants={{}} />;

<BroadSecuredDocumentButton label="Save document" grants={rootExampleGrants} />;
const buttonRef = React.createRef<HTMLButtonElement>();

<SecuredDocumentButton
  label="Save document"
  grants={{ document: resolved([DocumentGrant.EDIT]) }}
  ref={buttonRef}
/>;

// @ts-expect-error original required props remain required
<SecuredDocumentButton grants={{ document: resolved([DocumentGrant.EDIT]) }} ref={buttonRef} />;

// @ts-expect-error provided scopes remain required
<SecuredDocumentButton label="Save document" grants={{}} ref={buttonRef} />;

// @ts-expect-error the wrapped component retains its original ref target
<SecuredDocumentButton label="Save document" grants={{ document: resolved([DocumentGrant.EDIT]) }} ref={React.createRef<HTMLDivElement>()} />;

function ConflictingComponent(_props: { readonly grants: string; readonly label: string }) {
  void _props;
  return null;
}

// @ts-expect-error withPolicy reserves and consumes the grants prop
withPolicy(policyConfig)(ConflictingComponent);

function UnionConflictingComponent(_props:
  | { readonly kind: 'with-grants'; readonly grants: string }
  | { readonly kind: 'without-grants'; readonly label: string }
) {
  void _props;
  return null;
}

// @ts-expect-error grants is reserved even when only one props branch declares it
withPolicy(policyConfig)(UnionConflictingComponent);

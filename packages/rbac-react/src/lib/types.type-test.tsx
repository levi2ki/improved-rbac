import * as React from 'react';

import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import { createExpression, resolved, unresolved } from '@levi2ki/rbac-expression';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Verify the public package contract as a consumer.
import { createReactPolicy, type RegistryGrantContext } from '@levi2ki/rbac-react';

const testRegistry = register(createModule<'read' | 'write'>()('document'))(
  register(createModule<'read'>()('account'))(getDefaultRegistry()),
);
const {
  PolicyProvider,
  PolicyGate,
  usePolicy,
  useGrantContext,
  createPolicyBoundary,
  withPolicy,
} = createReactPolicy(testRegistry);
const { has, and } = createExpression(testRegistry);
const canReadDocument = has('document.read');
const canReadBoth = and([has('account.read'), canReadDocument]);
const foreignRegistry = register(createModule<'read'>()('foreign'))(getDefaultRegistry());
const foreignPolicy = createExpression(foreignRegistry).has('foreign.read');

function Consumer() {
  const context: RegistryGrantContext<typeof testRegistry> = useGrantContext();
  const documentAllowed: boolean = usePolicy(canReadDocument);
  const bothAllowed: boolean = usePolicy(canReadBoth);
  // @ts-expect-error policies requiring an unknown scope are incompatible
  usePolicy(foreignPolicy);
  return <output>{String(documentAllowed && bothAllowed)}{context.document.kind}</output>;
}

<PolicyProvider grants={{ document: resolved(['read']) }}><Consumer /></PolicyProvider>;
<PolicyGate policy={canReadDocument} />;
<PolicyGate policy={canReadBoth} fallback="Denied">Allowed</PolicyGate>;

// @ts-expect-error root grants are restricted to registry scopes
<PolicyProvider grants={{ foreign: unresolved }} />;

// @ts-expect-error grants are restricted to the declared vocabulary
<PolicyProvider grants={{ document: resolved(['delete']) }} />;

// @ts-expect-error gates reject policies requiring an unknown scope
<PolicyGate policy={foreignPolicy} />;

const DocumentBoundary = createPolicyBoundary({
  default: 'reset',
  scopes: { account: 'inherit', document: 'provide' },
} as const);

<DocumentBoundary grants={{ document: resolved(['read']) }} />;

// @ts-expect-error document is required because its strategy is provide
<DocumentBoundary grants={{}} />;

const grantsWithInheritedScope = {
  account: resolved(['read']),
  document: unresolved,
};

// @ts-expect-error account is inherited and cannot be supplied, including through variables
<DocumentBoundary grants={grantsWithInheritedScope} />;

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

const RefButton = React.forwardRef<HTMLButtonElement, { readonly label: string }>(
  ({ label }, ref) => <button ref={ref}>{label}</button>,
);
const SecuredButton = withPolicy(policyConfig)(RefButton);
const buttonRef = React.createRef<HTMLButtonElement>();

<SecuredButton label="Save" grants={{ document: resolved(['read']) }} ref={buttonRef} />;

// @ts-expect-error original required props remain required
<SecuredButton grants={{ document: resolved(['read']) }} ref={buttonRef} />;

// @ts-expect-error provided scopes remain required
<SecuredButton label="Save" grants={{}} ref={buttonRef} />;

// @ts-expect-error the wrapped component retains its original ref target
<SecuredButton label="Save" grants={{ document: resolved(['read']) }} ref={React.createRef<HTMLDivElement>()} />;

function ConflictingComponent(_props: { readonly grants: string; readonly label: string }) {
  void _props;
  return null;
}

// @ts-expect-error withPolicy reserves and consumes the grants prop
withPolicy(policyConfig)(ConflictingComponent);

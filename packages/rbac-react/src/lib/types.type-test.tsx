import * as React from 'react';

import { resolved, unresolved } from '@levi2ki/rbac-expression';

import { createPolicyBoundaryFactory } from './policy-boundary';
import { createReactPolicyContext } from './react-policy-context';
import { testRegistry } from './test-registry';

const { Context, useGrantContext } = createReactPolicyContext(testRegistry);
const createPolicyBoundary = createPolicyBoundaryFactory(testRegistry, Context, useGrantContext);
const { withPolicy } = createReactPolicyContext(testRegistry);

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

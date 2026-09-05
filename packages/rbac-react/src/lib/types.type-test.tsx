import { resolved, unresolved } from '@levi2ki/rbac-expression';

import { createPolicyBoundaryFactory } from './policy-boundary';
import { createReactPolicyContext } from './react-policy-context';
import { testRegistry } from './test-registry';

const { Context, useGrantContext } = createReactPolicyContext(testRegistry);
const createPolicyBoundary = createPolicyBoundaryFactory(testRegistry, Context, useGrantContext);

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

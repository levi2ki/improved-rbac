import * as React from 'react';

import { render, screen } from '@testing-library/react';

import { createExpression, resolved } from '@levi2ki/rbac-expression';

// eslint-disable-next-line @nx/enforce-module-boundaries -- Verify the public package contract as a consumer.
import { createReactPolicy } from '@levi2ki/rbac-react';
import { testRegistry } from './test-registry';

const { has } = createExpression(testRegistry);
const canWriteDocument = has('document.write');
const policyContext = createReactPolicy(testRegistry);
const { PolicyProvider, useGrantContext, usePolicy, withPolicy } = policyContext;

const BoundaryButton = React.forwardRef<HTMLButtonElement, { readonly label: string }>(
  (props, ref) => (
    <button
      ref={ref}
      data-grants-present={String('grants' in props)}
      data-can-write-document={String(usePolicy(canWriteDocument))}
    >
      {props.label}
    </button>
  ),
);
BoundaryButton.displayName = 'BoundaryButton';

function ContextProbe() {
  return <output>{JSON.stringify(useGrantContext())}</output>;
}

describe('withPolicy', () => {
  it('forwards original props and ref while consuming grants for the wrapped subtree', () => {
    const SecuredButton = withPolicy({
      default: 'reset',
      scopes: { account: 'inherit', document: 'provide' },
    } as const)(BoundaryButton);
    const ref = React.createRef<HTMLButtonElement>();

    render(
      <PolicyProvider grants={{ account: resolved(['read']), document: resolved(['read']) }}>
        <SecuredButton
          label="Save"
          grants={{ document: resolved(['write']) }}
          ref={ref}
        />
      </PolicyProvider>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('data-grants-present')).toBe('false');
    expect(button.getAttribute('data-can-write-document')).toBe('true');
    expect(ref.current).toBe(button);
  });

  it('inherits scopes according to its boundary configuration', () => {
    const WithInheritedAccount = withPolicy({
      default: 'reset',
      scopes: { account: 'inherit' },
    } as const)(ContextProbe);

    render(
      <PolicyProvider grants={{ account: resolved(['read']), document: resolved(['write']) }}>
        <WithInheritedAccount grants={{}} />
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"resolved","grants":["read"]},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });

  it('resets scopes according to its boundary configuration', () => {
    const WithResetDocument = withPolicy({
      default: 'inherit',
      scopes: { document: 'reset' },
    } as const)(ContextProbe);

    render(
      <PolicyProvider grants={{ account: resolved(['read']), document: resolved(['write']) }}>
        <WithResetDocument grants={{}} />
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"resolved","grants":["read"]},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });

  it('includes the wrapped component display name', () => {
    const SecuredButton = withPolicy({ default: 'inherit' } as const)(BoundaryButton);

    expect(SecuredButton.displayName).toContain('BoundaryButton');
  });
});

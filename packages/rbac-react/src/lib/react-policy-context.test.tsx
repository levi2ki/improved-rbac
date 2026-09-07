import { render, screen } from '@testing-library/react';

import { createExpression, resolved } from '@levi2ki/rbac-expression';

import { createReactPolicyContext } from './react-policy-context';
import { testRegistry } from './test-registry';

const { has, and } = createExpression(testRegistry);
const canReadDocument = has('document.read');
const canReadAccountAndDocument = and([has('account.read'), has('document.read')]);
const { PolicyProvider, useGrantContext, usePolicy } = createReactPolicyContext(testRegistry);

function ContextProbe() {
  const context = useGrantContext();
  return <output>{JSON.stringify(context)}</output>;
}

function PolicyProbe({ policy }: { readonly policy: typeof canReadDocument }) {
  return <output>{String(usePolicy(policy))}</output>;
}

function MultiScopePolicyProbe() {
  return <output>{String(usePolicy(canReadAccountAndDocument))}</output>;
}

describe('createReactPolicyContext', () => {
  it('fills omitted root scopes with unresolved grant states', () => {
    render(
      <PolicyProvider grants={{}}>
        <ContextProbe />
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"unresolved"},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });

  it('resets a removed root scope to unresolved after rerender', () => {
    const { rerender } = render(
      <PolicyProvider grants={{ document: resolved(['read']) }}>
        <ContextProbe />
      </PolicyProvider>,
    );
    expect(screen.getByText('{"account":{"kind":"unresolved"},"document":{"kind":"resolved","grants":["read"]}}')).toBeTruthy();

    rerender(
      <PolicyProvider grants={{}}>
        <ContextProbe />
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"unresolved"},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });

  it('evaluates a policy requiring one scope', () => {
    render(
      <PolicyProvider grants={{ document: resolved(['read']) }}>
        <PolicyProbe policy={canReadDocument} />
      </PolicyProvider>,
    );

    expect(screen.getByText('true')).toBeTruthy();
  });

  it('evaluates a policy requiring both scopes', () => {
    render(
      <PolicyProvider grants={{ account: resolved(['read']), document: resolved(['read']) }}>
        <MultiScopePolicyProbe />
      </PolicyProvider>,
    );

    expect(screen.getByText('true')).toBeTruthy();
  });

  it('throws when useGrantContext is rendered without PolicyProvider', () => {
    expect(() => render(<ContextProbe />)).toThrow(/PolicyProvider/);
  });

  it('throws when usePolicy is rendered without PolicyProvider', () => {
    expect(() => render(<PolicyProbe policy={canReadDocument} />)).toThrow(/PolicyProvider/);
  });

  it('preserves resolved empty grants separately from unresolved grants', () => {
    render(
      <PolicyProvider grants={{ account: resolved([]) }}>
        <ContextProbe />
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"resolved","grants":[]},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });
});

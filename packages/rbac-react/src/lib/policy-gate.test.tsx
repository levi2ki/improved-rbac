import { render, screen } from '@testing-library/react';

import { createExpression, resolved } from '@levi2ki/rbac-expression';

import { createReactPolicyContext } from './react-policy-context';
import { testRegistry } from './test-registry';

const { has } = createExpression(testRegistry);
const canReadDocument = has('document.read');
const policyContext = createReactPolicyContext(testRegistry);
const { PolicyGate, PolicyProvider } = policyContext;

describe('PolicyGate', () => {
  it('renders children and not fallback when the policy is allowed', () => {
    render(
      <PolicyProvider grants={{ document: resolved(['read']) }}>
        <PolicyGate policy={canReadDocument} fallback={<span>fallback</span>}>
          <span>children</span>
        </PolicyGate>
      </PolicyProvider>,
    );

    expect(screen.getByText('children')).toBeTruthy();
    expect(screen.queryByText('fallback')).toBeNull();
  });

  it('renders fallback and not children when the policy is denied', () => {
    render(
      <PolicyProvider grants={{ document: resolved([]) }}>
        <PolicyGate policy={canReadDocument} fallback={<span>fallback</span>}>
          <span>children</span>
        </PolicyGate>
      </PolicyProvider>,
    );

    expect(screen.getByText('fallback')).toBeTruthy();
    expect(screen.queryByText('children')).toBeNull();
  });

  it('renders nothing when a denied policy has no fallback', () => {
    render(
      <PolicyProvider grants={{ document: resolved([]) }}>
        <PolicyGate policy={canReadDocument}>
          <span>children</span>
        </PolicyGate>
      </PolicyProvider>,
    );

    expect(screen.queryByText('children')).toBeNull();
    expect(document.body.textContent).toBe('');
  });

  it('switches the rendered branch when provider context updates', () => {
    const { rerender } = render(
      <PolicyProvider grants={{ document: resolved([]) }}>
        <PolicyGate policy={canReadDocument} fallback={<span>fallback</span>}>
          <span>children</span>
        </PolicyGate>
      </PolicyProvider>,
    );

    expect(screen.getByText('fallback')).toBeTruthy();

    rerender(
      <PolicyProvider grants={{ document: resolved(['read']) }}>
        <PolicyGate policy={canReadDocument} fallback={<span>fallback</span>}>
          <span>children</span>
        </PolicyGate>
      </PolicyProvider>,
    );

    expect(screen.getByText('children')).toBeTruthy();
    expect(screen.queryByText('fallback')).toBeNull();
  });

  it('throws the missing-provider error outside PolicyProvider', () => {
    expect(() =>
      render(
        <PolicyGate policy={canReadDocument}>
          <span>children</span>
        </PolicyGate>,
      ),
    ).toThrow(/PolicyProvider/);
  });

  it('propagates exceptions thrown by a policy', () => {
    const error = new Error('policy failed');
    const throwingPolicy = () => {
      throw error;
    };

    expect(() =>
      render(
        <PolicyProvider grants={{ document: resolved(['read']) }}>
          <PolicyGate policy={throwingPolicy} fallback={<span>fallback</span>}>
            <span>children</span>
          </PolicyGate>
        </PolicyProvider>,
      ),
    ).toThrow(error);
  });
});

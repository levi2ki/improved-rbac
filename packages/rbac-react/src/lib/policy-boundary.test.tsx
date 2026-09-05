import { render, screen } from '@testing-library/react';

import { createExpression, resolved, unresolved } from '@levi2ki/rbac-expression';

import { createPolicyBoundaryFactory } from './policy-boundary';
import { createReactPolicyContext } from './react-policy-context';
import { testRegistry } from './test-registry';
import type { PolicyBoundaryConfig, PolicyBoundaryGrants } from './types';

const { and, has } = createExpression(testRegistry);
const canReadAccountAndWriteDocument = and([has('account.read'), has('document.write')]);
const policyContext = createReactPolicyContext(testRegistry);
const { Context, PolicyProvider, useGrantContext, usePolicy } = policyContext;
const createPolicyBoundary = createPolicyBoundaryFactory(testRegistry, Context, useGrantContext);

function ContextProbe() {
  return <output>{JSON.stringify(useGrantContext())}</output>;
}

function MultiScopePolicyProbe() {
  return <output>{String(usePolicy(canReadAccountAndWriteDocument))}</output>;
}

describe('createPolicyBoundary', () => {
  it('preserves a parent scope with explicit inherit', () => {
    const Boundary = createPolicyBoundary({
      default: 'reset',
      scopes: { account: 'inherit' },
    } as const);

    render(
      <PolicyProvider grants={{ account: resolved(['read']), document: resolved(['write']) }}>
        <Boundary grants={{}}>
          <ContextProbe />
        </Boundary>
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"resolved","grants":["read"]},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });

  it('replaces a parent scope with explicit provide', () => {
    const Boundary = createPolicyBoundary({
      default: 'inherit',
      scopes: { document: 'provide' },
    } as const);

    render(
      <PolicyProvider grants={{ document: resolved(['read']) }}>
        <Boundary grants={{ document: resolved(['write']) }}>
          <ContextProbe />
        </Boundary>
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"unresolved"},"document":{"kind":"resolved","grants":["write"]}}')).toBeTruthy();
  });

  it('replaces a parent scope with unresolved using explicit reset', () => {
    const Boundary = createPolicyBoundary({
      default: 'inherit',
      scopes: { document: 'reset' },
    } as const);

    render(
      <PolicyProvider grants={{ document: resolved(['read']) }}>
        <Boundary grants={{}}>
          <ContextProbe />
        </Boundary>
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"unresolved"},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });

  it('inherits every omitted scope with an inherit default', () => {
    const Boundary = createPolicyBoundary({ default: 'inherit' } as const);

    render(
      <PolicyProvider grants={{ account: resolved(['read']), document: resolved(['write']) }}>
        <Boundary grants={{}}>
          <ContextProbe />
        </Boundary>
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"resolved","grants":["read"]},"document":{"kind":"resolved","grants":["write"]}}')).toBeTruthy();
  });

  it('resets every omitted scope with a reset default', () => {
    const Boundary = createPolicyBoundary({ default: 'reset' } as const);

    render(
      <PolicyProvider grants={{ account: resolved(['read']), document: resolved(['write']) }}>
        <Boundary grants={{}}>
          <ContextProbe />
        </Boundary>
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"unresolved"},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });

  it('accepts an explicit unresolved grant for a provided scope', () => {
    const Boundary = createPolicyBoundary({
      default: 'inherit',
      scopes: { document: 'provide' },
    } as const);

    render(
      <PolicyProvider grants={{ document: resolved(['read']) }}>
        <Boundary grants={{ document: unresolved }}>
          <ContextProbe />
        </Boundary>
      </PolicyProvider>,
    );

    expect(screen.getByText('{"account":{"kind":"unresolved"},"document":{"kind":"unresolved"}}')).toBeTruthy();
  });

  it('combines nested boundary values for a multi-scope policy', () => {
    const DocumentBoundary = createPolicyBoundary({
      default: 'reset',
      scopes: { account: 'inherit', document: 'provide' },
    } as const);
    const AccountBoundary = createPolicyBoundary({
      default: 'reset',
      scopes: { account: 'provide', document: 'inherit' },
    } as const);

    render(
      <PolicyProvider grants={{ account: resolved(['read']), document: resolved(['read']) }}>
        <DocumentBoundary grants={{ document: resolved(['write']) }}>
          <AccountBoundary grants={{ account: resolved(['read']) }}>
            <MultiScopePolicyProbe />
          </AccountBoundary>
        </DocumentBoundary>
      </PolicyProvider>,
    );

    expect(screen.getByText('true')).toBeTruthy();
  });

  it('throws outside PolicyProvider', () => {
    const Boundary = createPolicyBoundary({ default: 'inherit' } as const);

    expect(() =>
      render(
        <Boundary grants={{}}>
          <ContextProbe />
        </Boundary>,
      ),
    ).toThrow(/PolicyProvider/);
  });

  it('rejects an unknown runtime scope', () => {
    expect(() =>
      createPolicyBoundary({
        default: 'inherit',
        scopes: { unknown: 'reset' },
      } as unknown as PolicyBoundaryConfig<typeof testRegistry>),
    ).toThrow('Unknown policy boundary scope "unknown".');
  });

  it('rejects an invalid runtime strategy', () => {
    expect(() =>
      createPolicyBoundary({
        default: 'inherit',
        scopes: { account: 'replace' },
      } as unknown as PolicyBoundaryConfig<typeof testRegistry>),
    ).toThrow('Invalid policy boundary strategy "replace" for scope "account".');
  });

  it('rejects a missing provided grant at render time', () => {
    const Boundary = createPolicyBoundary({
      default: 'inherit',
      scopes: { document: 'provide' },
    } as const);

    expect(() =>
      render(
        <PolicyProvider grants={{}}>
          <Boundary grants={{} as unknown as PolicyBoundaryGrants<typeof testRegistry, { readonly default: 'inherit'; readonly scopes: { readonly document: 'provide' } }>}>
            <ContextProbe />
          </Boundary>
        </PolicyProvider>,
      ),
    ).toThrow('Policy boundary must provide grants for scope "document".');
  });
});

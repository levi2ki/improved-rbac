import * as React from 'react';

import type { PolicyEvaluator } from '@levi2ki/rbac-expression';
import { unresolved } from '@levi2ki/rbac-expression';

import { createPolicyGateFactory } from './policy-gate';
import type { GenericRegistry, RegistryGrantContext } from './types';

function createRootContext<Reg extends GenericRegistry>(
  registry: Reg,
  grants: Partial<RegistryGrantContext<Reg>>,
): RegistryGrantContext<Reg> {
  const scopeNames = Object.keys(registry.modules) as Array<Extract<keyof Reg['modules'], string>>;

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
    return policy(useGrantContext() as PolicyContext);
  }

  function PolicyProvider({
    grants,
    children,
  }: React.PropsWithChildren<{ readonly grants: Partial<FullContext> }>) {
    const value = React.useMemo(() => createRootContext(registry, grants), [grants]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  const PolicyGate = createPolicyGateFactory<FullContext>(usePolicy);

  return { Context, PolicyProvider, PolicyGate, useGrantContext, usePolicy };
}

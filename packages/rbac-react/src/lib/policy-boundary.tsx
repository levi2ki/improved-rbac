import * as React from 'react';

import { unresolved } from '@levi2ki/rbac-expression';

import type {
  BoundaryStrategy,
  GenericRegistry,
  PolicyBoundaryConfig,
  PolicyBoundaryGrants,
  RegistryGrantContext,
} from './types';

type ScopeKey<Reg extends GenericRegistry> = Extract<keyof Reg['modules'], string>;

type BoundaryProps<Reg extends GenericRegistry, Config extends PolicyBoundaryConfig<Reg>> =
  React.PropsWithChildren<{
    readonly grants: PolicyBoundaryGrants<Reg, Config>;
  }>;

function hasOwn(object: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assertBoundaryStrategy(strategy: unknown, scope: string): asserts strategy is BoundaryStrategy {
  if (strategy !== 'inherit' && strategy !== 'provide' && strategy !== 'reset') {
    throw new Error(`Invalid policy boundary strategy "${String(strategy)}" for scope "${scope}".`);
  }
}

function normalizeBoundaryStrategies<Reg extends GenericRegistry>(
  registry: Reg,
  config: PolicyBoundaryConfig<Reg>,
): Readonly<Record<ScopeKey<Reg>, BoundaryStrategy>> {
  const scopeNames = Object.keys(registry.modules) as ScopeKey<Reg>[];
  const configuredScopes: Partial<Record<ScopeKey<Reg>, BoundaryStrategy>> = config.scopes ?? {};

  assertBoundaryStrategy(config.default, 'default');

  for (const [scope, strategy] of Object.entries(configuredScopes)) {
    if (!scopeNames.includes(scope as ScopeKey<Reg>)) {
      throw new Error(`Unknown policy boundary scope "${scope}".`);
    }

    assertBoundaryStrategy(strategy, scope);
  }

  const strategies = {} as Record<ScopeKey<Reg>, BoundaryStrategy>;

  for (const scope of scopeNames) {
    strategies[scope] = hasOwn(configuredScopes, scope)
      ? configuredScopes[scope] as BoundaryStrategy
      : config.default;
  }

  return Object.freeze(strategies);
}

function resolveBoundaryContext<
  Reg extends GenericRegistry,
  Config extends PolicyBoundaryConfig<Reg>,
>(
  scopeNames: readonly ScopeKey<Reg>[],
  strategies: Readonly<Record<ScopeKey<Reg>, BoundaryStrategy>>,
  parent: RegistryGrantContext<Reg>,
  grants: PolicyBoundaryGrants<Reg, Config>,
): RegistryGrantContext<Reg> {
  const next = {} as { -readonly [Scope in ScopeKey<Reg>]: RegistryGrantContext<Reg>[Scope] };
  const runtimeGrants = grants as unknown as Partial<RegistryGrantContext<Reg>>;

  for (const scope of scopeNames) {
    switch (strategies[scope]) {
      case 'inherit':
        next[scope] = parent[scope];
        break;
      case 'provide':
        if (!hasOwn(grants, scope)) {
          throw new Error(`Policy boundary must provide grants for scope "${scope}".`);
        }
        next[scope] = runtimeGrants[scope] as RegistryGrantContext<Reg>[typeof scope];
        break;
      case 'reset':
        next[scope] = unresolved;
        break;
    }
  }

  return next;
}

export function createPolicyBoundaryFactory<Reg extends GenericRegistry>(
  registry: Reg,
  Context: React.Context<RegistryGrantContext<Reg> | null>,
  useGrantContext: () => RegistryGrantContext<Reg>,
) {
  const scopeNames = Object.keys(registry.modules) as ScopeKey<Reg>[];

  return function createPolicyBoundary<Config extends PolicyBoundaryConfig<Reg>>(config: Config) {
    const strategies = normalizeBoundaryStrategies(registry, config);

    function PolicyBoundary({ grants, children }: BoundaryProps<Reg, Config>) {
      const parent = useGrantContext();
      const value = React.useMemo(
        () =>
          resolveBoundaryContext<Reg, Config>(
            scopeNames,
            strategies,
            parent,
            grants,
          ),
        [parent, grants],
      );

      return <Context.Provider value={value}>{children}</Context.Provider>;
    }

    return PolicyBoundary;
  };
}

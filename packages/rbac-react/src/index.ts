import { createPolicyBoundaryFactory } from './lib/policy-boundary';
import { createPolicyGateFactory } from './lib/policy-gate';
import { createReactPolicyContext } from './lib/react-policy-context';
import type { GenericRegistry, RegistryGrantContext } from './lib/types';
import { createWithPolicyFactory } from './lib/with-policy';

export type {
  BoundaryDefaultStrategy,
  BoundaryStrategy,
  CompatiblePolicy,
  PolicyBoundaryConfig,
  PolicyBoundaryGrants,
  RegistryGrantContext,
} from './lib/types';

export type { PolicyGateProps } from './lib/policy-gate';

export function createReactPolicy<Reg extends GenericRegistry>(registry: Reg) {
  const { Context, PolicyProvider, usePolicy, useGrantContext } = createReactPolicyContext(registry);
  const createPolicyBoundary = createPolicyBoundaryFactory(registry, Context, useGrantContext);
  const PolicyGate = createPolicyGateFactory<RegistryGrantContext<Reg>>(usePolicy);
  const withPolicy = createWithPolicyFactory(createPolicyBoundary);

  return {
    PolicyProvider,
    PolicyGate,
    usePolicy,
    useGrantContext,
    createPolicyBoundary,
    withPolicy,
  };
}

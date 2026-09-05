import * as React from 'react';

import type { PolicyEvaluator } from '@levi2ki/rbac-expression';

export interface PolicyGateProps<FullContext, PolicyContext> {
  readonly policy: PolicyEvaluator<PolicyContext> &
    (FullContext extends PolicyContext ? unknown : never);
  readonly children?: React.ReactNode;
  readonly fallback?: React.ReactNode;
}

type UsePolicy<FullContext> = <PolicyContext>(
  policy: PolicyEvaluator<PolicyContext> &
    (FullContext extends PolicyContext ? unknown : never),
) => boolean;

export function createPolicyGateFactory<FullContext>(usePolicy: UsePolicy<FullContext>) {
  return function PolicyGate<PolicyContext>({
    policy,
    children,
    fallback = null,
  }: PolicyGateProps<FullContext, PolicyContext>) {
    return <>{usePolicy(policy) ? children : fallback}</>;
  };
}

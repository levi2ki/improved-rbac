import * as React from 'react';

import type {
  GenericRegistry,
  PolicyBoundaryConfig,
  PolicyBoundaryGrants,
} from './types';

type CreatePolicyBoundary<Reg extends GenericRegistry> = <
  Config extends PolicyBoundaryConfig<Reg>,
>(
  config: Config,
) => React.ComponentType<
  React.PropsWithChildren<{
    readonly grants: PolicyBoundaryGrants<Reg, Config>;
  }>
>;

type RejectGrantsProp<Component extends React.ElementType> =
  'grants' extends keyof React.ComponentPropsWithoutRef<Component> ? never : Component;

function getDisplayName(Component: React.ElementType): string {
  if (typeof Component === 'string') {
    return Component;
  }

  if (typeof Component.displayName === 'string') {
    return Component.displayName;
  }

  return 'name' in Component && typeof Component.name === 'string' ? Component.name : 'Component';
}

export function createWithPolicyFactory<Reg extends GenericRegistry>(
  createPolicyBoundary: CreatePolicyBoundary<Reg>,
) {
  return function withPolicy<Config extends PolicyBoundaryConfig<Reg>>(config: Config) {
    const Boundary = createPolicyBoundary(config);

    return function wrap<Component extends React.ElementType>(
      WrappedComponent: RejectGrantsProp<Component>,
    ): React.ForwardRefExoticComponent<
      React.PropsWithoutRef<
        React.ComponentPropsWithoutRef<Component> & {
          readonly grants: PolicyBoundaryGrants<Reg, Config>;
        }
      > & React.RefAttributes<React.ComponentRef<Component>>
    > {
      type WrappedProps = React.ComponentPropsWithoutRef<Component>;
      type WithPolicyProps = WrappedProps & {
        readonly grants: PolicyBoundaryGrants<Reg, Config>;
      };

      const WithPolicy = React.forwardRef<React.ComponentRef<Component>, WithPolicyProps>(
        ({ grants, ...originalProps }, ref) => (
          <Boundary grants={grants}>
            <WrappedComponent
              {...({ ...originalProps, ref } as React.ComponentPropsWithRef<React.ElementType>)}
            />
          </Boundary>
        ),
      );

      WithPolicy.displayName = `withPolicy(${getDisplayName(WrappedComponent)})`;

      return WithPolicy;
    };
  };
}

import type { Module, ModulePermissions, Registry } from '@levi2ki/rbac-core';
import type { GrantState, PolicyEvaluator } from '@levi2ki/rbac-expression';

type GenericRegistry = Registry<Record<string, Module<unknown, string>>>;

type ScopeKey<Reg extends GenericRegistry> = Extract<keyof Reg['modules'], string>;

export type BoundaryStrategy = 'inherit' | 'provide' | 'reset';

export type BoundaryDefaultStrategy = Exclude<BoundaryStrategy, 'provide'>;

export interface PolicyBoundaryConfig<Reg extends GenericRegistry> {
  readonly default: BoundaryDefaultStrategy;
  readonly scopes?: Partial<Record<ScopeKey<Reg>, BoundaryStrategy>>;
}

export type ClosedPolicyBoundaryConfig<
  Reg extends GenericRegistry,
  Config extends PolicyBoundaryConfig<Reg>,
> = {
  readonly scopes?: {
    readonly [Scope in Exclude<keyof NonNullable<Config['scopes']>, ScopeKey<Reg>>]: never;
  };
};

export type RegistryGrantContext<Reg extends GenericRegistry> = {
  readonly [Scope in Extract<keyof Reg['modules'], string>]: GrantState<
    Extract<ModulePermissions<Reg['modules'][Scope]>, string>
  >;
};

export type CompatiblePolicy<FullContext, PolicyContext> = FullContext extends PolicyContext
  ? PolicyEvaluator<PolicyContext>
  : never;

type StrategyFor<
  Config extends PolicyBoundaryConfig<GenericRegistry>,
  Scope extends PropertyKey,
> = Config extends { readonly scopes?: infer Strategies }
  ? Scope extends keyof NonNullable<Strategies>
    ? NonNullable<Strategies>[Scope]
    : Config['default']
  : Config['default'];

export type PolicyBoundaryGrants<
  Reg extends GenericRegistry,
  Config extends PolicyBoundaryConfig<Reg>,
> = {
  readonly [Scope in ScopeKey<Reg> as 'provide' extends StrategyFor<Config, Scope>
    ? Scope
    : never]-?: RegistryGrantContext<Reg>[Scope];
} & {
  readonly [Scope in ScopeKey<Reg> as 'provide' extends StrategyFor<Config, Scope>
    ? never
    : Scope]?: never;
};

export type { GenericRegistry };

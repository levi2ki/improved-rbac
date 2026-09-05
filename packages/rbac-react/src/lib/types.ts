import type { Module, ModulePermissions, Registry } from '@levi2ki/rbac-core';
import type { GrantState, PolicyEvaluator } from '@levi2ki/rbac-expression';

type GenericRegistry = Registry<Record<string, Module<any, string>>>;

export type RegistryGrantContext<Reg extends GenericRegistry> = {
  readonly [Scope in Extract<keyof Reg['modules'], string>]: GrantState<
    Extract<ModulePermissions<Reg['modules'][Scope]>, string>
  >;
};

export type CompatiblePolicy<FullContext, PolicyContext> = FullContext extends PolicyContext
  ? PolicyEvaluator<PolicyContext>
  : never;

export type { GenericRegistry };

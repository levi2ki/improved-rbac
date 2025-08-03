import { Module } from './module';

declare type IfDef<LEFT, True, False> = [LEFT] extends [never] ? False : True;
declare type KeysIntersection<A, B> = keyof A & keyof B;

export interface Registry<Context extends { [x: string]: Module<any, string> }> {
    readonly modules: Context;
}

export function getDefaultRegistry(): Registry<NonNullable<unknown>> {
    return { modules: {} };
}

export function register<P, N extends string>(module: Module<P, N>) {
    return <
        C extends NonNullable<unknown>,
        ModulesNeverIntersect = IfDef<KeysIntersection<C, { [K in N]: Module<P, N> }>, never, NonNullable<unknown>>
    >(
        registry: Registry<C>
    ): ModulesNeverIntersect & Registry<C & { [K in N]: Module<P, N> }> => {
        if (module.moduleName in registry.modules) {
            throw new Error(`Key duplication detected between ${module.moduleName} - modules must have unique name`);
        }
        return { ...registry, modules: { ...registry.modules, [module.moduleName]: module } } as ModulesNeverIntersect &
            Registry<C & { [K in N]: Module<P, N> }>;
    };
}

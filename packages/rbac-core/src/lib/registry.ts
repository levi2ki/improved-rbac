import { Module } from "./module";

declare type IfDef<LEFT, True, False> = [LEFT] extends [never] ? False : True;
declare type KeysIntersection<A, B> = keyof A & keyof B;

export interface Registry<Context extends { [x: string]: Module<any, string>}> {
    readonly modules: Context;
}


export function getDefaultRegistry(): Registry<{}> {
    return { modules: {} };
}


export function register<P, N extends string>(module: Module<P, N>) {
    return <C extends {}, ModulesNeverIntersect = IfDef<KeysIntersection<C, { [K in N]: Module<P, N> }>, never, {}>>(
        registry: Registry<C>,
    ): ModulesNeverIntersect & Registry<C & { [K in N]: Module<P, N> }> => {
        if (module.moduleName in registry.modules) {
            throw new Error(`Key duplication detected between ${module.moduleName} - modules must have unique name`);
        }
        return { ...registry, modules: { ...registry.modules, [module.moduleName]: module } } as ModulesNeverIntersect &
            Registry<C & { [K in N]: Module<P, N> }>;
    };
}

export interface Module<Permissions, ModuleName extends string> {
    /**
     * hidden type for type inference
     * @internal
     */
    readonly __A: Permissions;
    readonly moduleName: ModuleName;
}

export type ModulePermissions<M extends Module<any, any>> = M['__A'];

export function createModule<Permissions>() {
    return <ModuleName extends string>(moduleName: ModuleName): Module<Permissions, ModuleName> => {
        return {
            moduleName,
            __A: '' as unknown as Permissions,
        };
    };
}

export interface Module<Permissions, ModuleName extends string> {
    /**
     * хитрый хак с вытаскиванием параметризованных типов - в рантайме ничего не делать и **рекомендуется к игнорированию в рантайме**.
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

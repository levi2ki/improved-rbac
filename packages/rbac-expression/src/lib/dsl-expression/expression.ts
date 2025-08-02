import { Reader } from 'fp-ts/Reader';
import { type Module, type Registry, type ModulePermissions } from '@levi2ki/rbac-core';
import { constFalse, pipe } from 'fp-ts/function';
import { type Option, flatten, fromNullable, match } from 'fp-ts/Option';

type GenericRegistry = Registry<Record<string, Module<any, string>>>;

type GetScope<F> = F extends `${infer S}.${string}` ? S : never;
type GetPermission<F> = F extends `${string}.${infer S}` ? S : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type ScopeKeys<Reg extends GenericRegistry> = keyof Reg['modules'];
type Scopes<Reg extends GenericRegistry> = {
    [K in ScopeKeys<Reg>]: `${K & string}.${ModulePermissions<Reg['modules'][K]>}`;
}[ScopeKeys<Reg>];

function split<F extends Scopes<any>>(p: NoInfer<F>): [scope: GetScope<F>, permission: GetPermission<F>] {
    return p.split('.') as [GetScope<F>, GetPermission<F>];
}

const and =
    <GenericReader extends Reader<any, boolean>, O extends Parameters<GenericReader>[0]>(
        expr: Array<GenericReader>
    ): Reader<{ [K in keyof UnionToIntersection<O>]: UnionToIntersection<O>[K] }, boolean> =>
    (layer) => {
        return expr.reduce((init, next) => init && next(layer), true);
    };

const or =
    <GenericReader extends Reader<any, boolean>, O extends Parameters<GenericReader>[0]>(
        expr: Array<GenericReader>
    ): Reader<{ [K in keyof UnionToIntersection<O>]: UnionToIntersection<O>[K] }, boolean> =>
    (layer) => {
        return expr.reduce((init, next) => init || next(layer), false);
    };

export function createExpression<Reg extends GenericRegistry>(registry: Reg) {
    const has =
        <F extends Scopes<Reg>>(p: F) =>
        (layer: {
            [K in GetScope<F>]: Option<Array<ModulePermissions<Reg['modules'][K]>>>;
        }): boolean => {
            const [scope, permission] = split<F>(p);

            const maybeScope = fromNullable(layer[scope]);

            return pipe(
                maybeScope,
                flatten,
                match(constFalse, (p) => p.includes(permission))
            );
        };

    const not =
        <F extends Scopes<Reg>>(p: F) =>
        (layer: {
            [K in GetScope<F>]: Option<Array<ModulePermissions<Reg['modules'][K]>>>;
        }) => {
            const [scope, permission] = split<F>(p);

            const maybeScope = fromNullable(layer[scope]);

            return pipe(
                maybeScope,
                flatten,
                match(constFalse, (p) => !p.includes(permission))
            );
        };

    return { has, not, and, or };
}

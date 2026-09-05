import { type Module, type Registry, type ModulePermissions } from '@levi2ki/rbac-core';
import { none, some, type Option, match } from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { type GrantState, isResolved } from '../grant-state';

type GenericRegistry = Registry<Record<string, Module<any, string>>>;

type GetScope<F> = F extends `${infer S}.${string}` ? S : never;
type GetPermission<F> = F extends `${string}.${infer S}` ? S : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type ScopeKeys<Reg extends GenericRegistry> = keyof Reg['modules'];
type Scopes<Reg extends GenericRegistry> = {
    [K in ScopeKeys<Reg>]: `${K & string}.${ModulePermissions<Reg['modules'][K]>}`;
}[ScopeKeys<Reg>];

export type PolicyEvaluator<Context> = (context: Context) => boolean;
type EvaluatorContext<Evaluator> = Evaluator extends PolicyEvaluator<infer Context> ? Context : never;
export type PolicyContext<Reg extends GenericRegistry, F extends Scopes<Reg>> = {
    [K in GetScope<F>]: GrantState<Extract<ModulePermissions<Reg['modules'][K & ScopeKeys<Reg>]>, string>>;
};

function split<F extends Scopes<any>>(p: NoInfer<F>): [scope: GetScope<F>, permission: GetPermission<F>] {
    return p.split('.') as [GetScope<F>, GetPermission<F>];
}

function toResolvedGrants<Grant extends string>(state: GrantState<Grant> | undefined): Option<readonly Grant[]> {
    if (!isResolved(state)) {
        return none;
    }
    return some(state.grants);
}

const and =
    <Evaluators extends readonly PolicyEvaluator<any>[]>(
        expr: Evaluators
    ): PolicyEvaluator<
        {
            [K in keyof UnionToIntersection<EvaluatorContext<Evaluators[number]>>]: UnionToIntersection<
                EvaluatorContext<Evaluators[number]>
            >[K];
        }
    > =>
    (layer) => {
        return expr.reduce((init, next) => init && next(layer), true);
    };

const or =
    <Evaluators extends readonly PolicyEvaluator<any>[]>(
        expr: Evaluators
    ): PolicyEvaluator<
        {
            [K in keyof UnionToIntersection<EvaluatorContext<Evaluators[number]>>]: UnionToIntersection<
                EvaluatorContext<Evaluators[number]>
            >[K];
        }
    > =>
    (layer) => {
        return expr.reduce((init, next) => init || next(layer), false);
    };

export function createExpression<Reg extends GenericRegistry>(registry: Reg) {
    const has =
        <F extends Scopes<Reg>>(p: F) =>
        (layer: PolicyContext<Reg, F>): boolean => {
            const [scope, permission] = split<F>(p);

            return pipe(
                toResolvedGrants(layer[scope]),
                match(
                    () => false,
                    (grants) => grants.some((grant) => grant === permission)
                )
            );
        };

    const not =
        <F extends Scopes<Reg>>(p: F) =>
        (layer: PolicyContext<Reg, F>) => {
            const [scope, permission] = split<F>(p);

            return pipe(
                toResolvedGrants(layer[scope]),
                match(
                    () => false,
                    (grants) => !grants.some((grant) => grant === permission)
                )
            );
        };

    return { has, not, and, or };
}

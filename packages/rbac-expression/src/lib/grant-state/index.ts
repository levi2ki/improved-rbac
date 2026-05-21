export interface Unresolved {
    readonly kind: 'unresolved';
}

export interface Resolved<Grant extends string> {
    readonly kind: 'resolved';
    readonly grants: readonly Grant[];
}

export type GrantState<Grant extends string> = Unresolved | Resolved<Grant>;

export const unresolved: Unresolved = { kind: 'unresolved' };

export function resolved<Grant extends string>(grants: readonly Grant[]): Resolved<Grant> {
    return { kind: 'resolved', grants };
}

export function isResolved<Grant extends string>(state: GrantState<Grant> | undefined): state is Resolved<Grant> {
    return state?.kind === 'resolved';
}

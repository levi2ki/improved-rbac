import { isResolved, resolved, unresolved } from './index';

describe('grant-state', () => {
    it('resolved should create resolved state', () => {
        const state = resolved(['READ', 'WRITE'] as const);

        expect(state).toEqual({
            kind: 'resolved',
            grants: ['READ', 'WRITE'],
        });
    });

    it('unresolved should expose unresolved state', () => {
        expect(unresolved).toEqual({ kind: 'unresolved' });
    });

    it('isResolved should narrow only resolved states', () => {
        expect(isResolved(resolved(['READ']))).toBe(true);
        expect(isResolved(unresolved)).toBe(false);
        expect(isResolved(undefined)).toBe(false);
    });
});

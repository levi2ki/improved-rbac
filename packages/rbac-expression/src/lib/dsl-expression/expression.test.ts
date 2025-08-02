import { pipe } from 'fp-ts/function';
import * as Option from 'fp-ts/Option';

import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import { createExpression } from './expression';

enum EUserPermissions {
    READ = 'READ',
    WRITE = 'WRITE',
    UPDATE = 'UPDATE',
    CREATE = 'CREATE',
    DELETE = 'DELETE',
}

enum ETeamPermissions {
    READ = 'READ',
    WRITE = 'WRITE',
    UPDATE = 'UPDATE',
    CREATE = 'CREATE',
    DELETE = 'DELETE',
}

enum ESupportPermissions {
    READ = 'READ',
    WRITE = 'WRITE',
    UPDATE = 'UPDATE',
    CREATE = 'CREATE',
    DELETE = 'DELETE',
}

const testRegistry = pipe(
    getDefaultRegistry(),
    register(createModule<ETeamPermissions>()('team')),
    register(createModule<EUserPermissions>()('user')),
    register(createModule<ESupportPermissions>()('support'))
);

const { has, not, and, or } = createExpression(testRegistry);

describe('RBAC Operators V2', () => {
    describe('operators', () => {
        it('operators methods should have basic operator methods', () => {
            expect(typeof or).toBe('function');
            expect(typeof and).toBe('function');
            expect(typeof has).toBe('function');
            expect(typeof not).toBe('function');
        });

        it('operators.has should return true if permission exists', () => {
            const context = { user: Option.some([EUserPermissions.READ]) };
            expect(has('user.READ')(context)).toBe(true);
        });

        it('has should return false if permission does not exist', () => {
            const context = { user: Option.some([EUserPermissions.READ]) };
            expect(has('user.WRITE')(context)).toBe(false);
        });

        it('has should return false if context is empty', () => {
            const context = { user: Option.none };
            expect(has('user.READ')(context)).toBe(false);
        });

        it('has should not throw if provided context is insufficient regardless type errors', () => {
            const context = {};
            expect(() =>
                has('user.READ')(
                    // @ts-expect-error - context is insufficient
                    context
                )
            ).not.toThrow();
        });
        it('not should return true if permission does not exist', () => {
            const context = { user: Option.some([EUserPermissions.UPDATE]) };
            expect(not('user.READ')(context)).toBe(true);
        });

        it('not should return false if permission exists', () => {
            const context = { user: Option.some([EUserPermissions.UPDATE]) };
            expect(not('user.UPDATE')(context)).toBe(false);
        });

        it('not should return false if context is empty', () => {
            const context = { user: Option.none };
            expect(not('user.READ')(context)).toBe(false);
        });

        it('not should not throw if provided context is insufficient regardless type errors', () => {
            const context = {};
            expect(() =>
                not('user.READ')(
                    // @ts-expect-error - context is insufficient
                    context
                )
            ).not.toThrow();
        });

        it('or should return true if any permission exists', () => {
            const context = { user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]) };
            expect(or([has('user.READ'), has('user.WRITE')])(context)).toBe(true);
        });

        it('or should return false if all permissions do not exist', () => {
            const context = { user: Option.some([EUserPermissions.READ]) };
            expect(or([has('user.WRITE'), has('user.UPDATE')])(context)).toBe(false);
        });

        it('and should return true if all permissions exist', () => {
            const context = { user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]) };
            expect(and([has('user.READ'), has('user.WRITE')])(context)).toBe(true);
        });

        it('and should return false if any permission does not exist', () => {
            const context = { user: Option.some([EUserPermissions.READ]) };
            expect(and([has('user.READ'), has('user.WRITE')])(context)).toBe(false);
        });

        describe('typelevel tests', () => {
            it('and should throw typescript error if provided context is insufficient', () => {
                const context = { user: Option.none };
                const expression = and([has('user.READ'), has('team.READ')]);

                // @ts-expect-error - context is insufficient
                const result = expression(context);

                expect(result).toBe(false);
            });

            it('universalOperators.or should throw typescript error if provided context is insufficient', () => {
                const context = { user: Option.none };
                const expression = or([has('user.READ'), has('team.READ')]);

                // @ts-expect-error - context is insufficient
                const result = expression(context);

                expect(result).toBe(false);
            });
        });
    });
});

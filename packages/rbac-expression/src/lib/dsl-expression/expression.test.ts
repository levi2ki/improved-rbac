import { pipe } from 'fp-ts/function';
import * as Option from 'fp-ts/Option';

import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';
import { createExpression } from './expression';
import { EUserPermissions, ETeamPermissions, ESupportPermissions } from './__mocks__/permissions.mock';
import { createLargeTestContext } from './__mocks__/test-data.mock';

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

        describe('has operator', () => {
            it('should return true if permission exists', () => {
                const context = { user: Option.some([EUserPermissions.READ]) };
                expect(has('user.READ')(context)).toBe(true);
            });

            it('should return false if permission does not exist', () => {
                const context = { user: Option.some([EUserPermissions.READ]) };
                expect(has('user.WRITE')(context)).toBe(false);
                expect(has('user.VIEW')(context)).toBe(false);
            });

            it('should return false if context is empty', () => {
                const context = { user: Option.none };
                expect(has('user.READ')(context)).toBe(false);
            });

            it('should not throw if provided context is insufficient regardless type errors', () => {
                const context = {};
                expect(() =>
                    has('user.READ')(
                        // @ts-expect-error - context is insufficient
                        context
                    )
                ).not.toThrow();
            });

            it('should handle multiple permissions in context', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE, EUserPermissions.UPDATE]),
                };
                expect(has('user.READ')(context)).toBe(true);
                expect(has('user.WRITE')(context)).toBe(true);
                expect(has('user.UPDATE')(context)).toBe(true);
                expect(has('user.CREATE')(context)).toBe(false);
                expect(has('user.DELETE')(context)).toBe(false);
                expect(has('user.VIEW')(context)).toBe(false);
            });

            it('should handle empty permissions array', () => {
                const context = { user: Option.some([]) };
                expect(has('user.READ')(context)).toBe(false);
            });

            it('should work with different scopes', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ]),
                    team: Option.some([ETeamPermissions.WRITE]),
                    support: Option.some([ESupportPermissions.UPDATE]),
                };
                expect(has('user.READ')(context)).toBe(true);
                expect(has('team.WRITE')(context)).toBe(true);
                expect(has('support.UPDATE')(context)).toBe(true);
                expect(has('user.WRITE')(context)).toBe(false);
            });
        });

        describe('not operator', () => {
            it('should return true if permission does not exist', () => {
                const context = { user: Option.some([EUserPermissions.UPDATE]) };
                expect(not('user.READ')(context)).toBe(true);
            });

            it('should return false if permission exists', () => {
                const context = { user: Option.some([EUserPermissions.UPDATE]) };
                expect(not('user.UPDATE')(context)).toBe(false);
            });

            it('should return false if context is empty', () => {
                const context = { user: Option.none };
                expect(not('user.READ')(context)).toBe(false);
            });

            it('should not throw if provided context is insufficient regardless type errors', () => {
                const context = {};
                expect(() =>
                    not('user.READ')(
                        // @ts-expect-error - context is insufficient
                        context
                    )
                ).not.toThrow();
            });

            it('should handle multiple permissions in context', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]),
                };
                expect(not('user.READ')(context)).toBe(false);
                expect(not('user.WRITE')(context)).toBe(false);
                expect(not('user.UPDATE')(context)).toBe(true);
            });

            it('should handle empty permissions array', () => {
                const context = { user: Option.some([]) };
                expect(not('user.READ')(context)).toBe(true);
            });
        });

        describe('or operator', () => {
            it('should return true if any permission exists', () => {
                const context = { user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]) };
                expect(or([has('user.READ'), has('user.WRITE')])(context)).toBe(true);
            });

            it('should return false if all permissions do not exist', () => {
                const context = { user: Option.some([EUserPermissions.READ]) };
                expect(or([has('user.WRITE'), has('user.UPDATE')])(context)).toBe(false);
            });

            it('should return true if at least one permission exists', () => {
                const context = { user: Option.some([EUserPermissions.READ]) };
                expect(or([has('user.READ'), has('user.WRITE')])(context)).toBe(true);
            });

            it('should return false for empty expressions array', () => {
                const context = { user: Option.some([EUserPermissions.READ]) };
                expect(or([])(context)).toBe(false);
            });

            it('should work with mixed scopes', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ]),
                    team: Option.some([ETeamPermissions.WRITE]),
                };
                expect(or([has('user.READ'), has('team.READ')])(context)).toBe(true);
                expect(or([has('user.WRITE'), has('team.READ')])(context)).toBe(false);
            });

            it('should handle complex nested expressions', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]),
                    team: Option.some([ETeamPermissions.UPDATE]),
                };
                const expression = or([has('user.READ'), and([has('user.WRITE'), has('team.UPDATE')])]);
                expect(expression(context)).toBe(true);
            });
        });

        describe('and operator', () => {
            it('should return true if all permissions exist', () => {
                const context = { user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]) };
                expect(and([has('user.READ'), has('user.WRITE')])(context)).toBe(true);
            });

            it('should return false if any permission does not exist', () => {
                const context = { user: Option.some([EUserPermissions.READ]) };
                expect(and([has('user.READ'), has('user.WRITE')])(context)).toBe(false);
            });

            it('should return true for empty expressions array', () => {
                const context = { user: Option.some([EUserPermissions.READ]) };
                expect(and([])(context)).toBe(true);
            });

            it('should work with mixed scopes', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ]),
                    team: Option.some([ETeamPermissions.WRITE]),
                };
                expect(and([has('user.READ'), has('team.WRITE')])(context)).toBe(true);
                expect(and([has('user.READ'), has('team.READ')])(context)).toBe(false);
            });

            it('should handle complex nested expressions', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]),
                    team: Option.some([ETeamPermissions.UPDATE]),
                };
                const expression = and([has('user.READ'), or([has('user.WRITE'), has('team.UPDATE')])]);
                expect(expression(context)).toBe(true);
            });
        });

        describe('edge cases and error handling', () => {
            it('should handle undefined context properties gracefully', () => {
                const context = { user: Option.none };
                expect(() => has('user.READ')(context)).not.toThrow();
                expect(() => not('user.READ')(context)).not.toThrow();
                expect(() => and([has('user.READ')])(context)).not.toThrow();
                expect(() => or([has('user.READ')])(context)).not.toThrow();
            });

            it('should handle null context gracefully', () => {
                const context = null;
                expect(() => {
                    // @ts-expect-error - testing null context
                    has('user.READ')(context);
                }).toThrow();
            });

            it('should handle duplicate permissions in context', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ, EUserPermissions.READ, EUserPermissions.WRITE]),
                };
                expect(has('user.READ')(context)).toBe(true);
                expect(has('user.WRITE')(context)).toBe(true);
            });

            it.todo('should handle case sensitivity correctly');
        });

        describe('comprehensive operator combinations', () => {
            it('should handle complex logical combinations', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]),
                    team: Option.some([ETeamPermissions.UPDATE]),
                    support: Option.some([ESupportPermissions.CREATE]),
                };

                // Test complex expression: (user.READ AND team.UPDATE) OR (user.WRITE AND support.CREATE)
                const complexExpression = or([
                    and([has('user.READ'), has('team.UPDATE')]),
                    and([has('user.WRITE'), has('support.CREATE')]),
                ]);

                expect(complexExpression(context)).toBe(true);
            });

            it("should handle De Morgan's law", () => {
                const context = {
                    user: Option.some([EUserPermissions.READ]),
                    team: Option.some([ETeamPermissions.WRITE]),
                    support: Option.none,
                };

                // Test: NOT(A AND B) = NOT(A) OR NOT(B)
                // In this case: NOT(user.READ AND team.READ) = NOT(user.READ) OR NOT(team.READ)
                // user.READ exists (true), team.READ doesn't exist (false)
                // So: NOT(true AND false) = NOT(true) OR NOT(false) = false OR true = true

                // Left side: NOT(user.READ AND team.READ)
                const userReadAndTeamRead = and([has('user.READ'), has('team.READ')]);
                const leftSide = !userReadAndTeamRead(context);

                // Right side: NOT(user.READ) OR NOT(team.READ)
                const rightSide = or([not('user.READ'), not('team.READ')]);

                expect(leftSide).toBe(rightSide(context));
            });

            it('should handle distributive law', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]),
                    team: Option.some([ETeamPermissions.UPDATE]),
                    support: Option.none,
                };

                // Test: A AND (B OR C) = (A AND B) OR (A AND C)
                const leftSide = and([has('user.READ'), or([has('user.WRITE'), has('team.UPDATE')])]);
                const rightSide = or([
                    and([has('user.READ'), has('user.WRITE')]),
                    and([has('user.READ'), has('team.UPDATE')]),
                ]);

                expect(leftSide(context)).toBe(rightSide(context));
            });
        });

        describe('boundary conditions', () => {
            it('should handle single permission in context', () => {
                const context = { user: Option.some([EUserPermissions.READ]) };
                expect(has('user.READ')(context)).toBe(true);
                expect(not('user.READ')(context)).toBe(false);
            });

            it('should handle all permissions in context', () => {
                const context = {
                    user: Option.some([
                        EUserPermissions.READ,
                        EUserPermissions.WRITE,
                        EUserPermissions.UPDATE,
                        EUserPermissions.CREATE,
                        EUserPermissions.DELETE,
                    ]),
                };

                expect(has('user.READ')(context)).toBe(true);
                expect(has('user.WRITE')(context)).toBe(true);
                expect(has('user.UPDATE')(context)).toBe(true);
                expect(has('user.CREATE')(context)).toBe(true);
                expect(has('user.DELETE')(context)).toBe(true);
            });

            it('should handle maximum nesting depth', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ]),
                    team: Option.some([ETeamPermissions.WRITE]),
                    support: Option.none,
                };

                // Test very deep nesting (1500 levels)
                // Use only and combinator beacuse or has short circuiting
                let expression: any = has('user.READ');
                for (let i = 0; i < 1500; i++) {
                    expression = and([expression, has('team.WRITE')]);
                }

                const result = expression(context);
                expect(result).toBe(true);
            });
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

            it('should handle complex type intersections correctly', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ]),
                    team: Option.some([ETeamPermissions.WRITE]),
                    support: Option.some([ESupportPermissions.UPDATE]),
                };

                const complexExpression = and([
                    or([has('user.READ'), has('team.READ')]),
                    and([has('team.WRITE'), has('support.UPDATE')]),
                ]);

                expect(complexExpression(context)).toBe(true);
            });
        });

        describe('performance and memory tests', () => {
            it('should handle large permission arrays efficiently', () => {
                const context = createLargeTestContext();

                const startTime = performance.now();
                // Use last permission from large test context for testing all array length loops
                const result = has('user.AUTHORIZE_SELF_ACCELERATION_10')(context);
                const endTime = performance.now();

                expect(result).toBe(true);
                expect(endTime - startTime).toBeLessThan(3); // Should complete in less than 3ms
            });

            it('should handle deeply nested expressions', () => {
                const context = {
                    user: Option.some([EUserPermissions.READ, EUserPermissions.WRITE]),
                    team: Option.some([ETeamPermissions.UPDATE]),
                    support: Option.some([ESupportPermissions.CREATE, ESupportPermissions.WRITE]),
                };

                // Test very deep nesting (1500 levels)
                // Create a deeply nested expression using proper typing
                // Use only and combinator beacuse or has short circuiting
                const expression = and([
                    has('user.READ'),
                    and([
                        has('team.UPDATE'),
                        and([has('user.WRITE'), and([has('team.UPDATE'), has('support.CREATE')])]),
                    ]),
                ]);

                expect(expression(context)).toBe(true);

                // Additional test for very deep nesting (1500 levels)
                // This tests the type system's ability to handle complex nested types
                let deepExpression: any = has('user.READ');
                for (let i = 0; i < 1499; i++) {
                    deepExpression = and([deepExpression, has('team.UPDATE')]);
                }
                deepExpression = and([deepExpression, has('support.WRITE')]);

                const deepResult = deepExpression(context);
                expect(deepResult).toBe(true);
            });
        });
    });
});

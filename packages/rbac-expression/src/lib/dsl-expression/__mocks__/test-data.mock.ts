import * as Option from 'fp-ts/Option';
import { EUserPermissions, ETeamPermissions, ESupportPermissions } from './permissions.mock';

// Large permission arrays for performance testing
export const largeUserPermissions: EUserPermissions[] = Object.values(EUserPermissions).filter(
    (value): value is EUserPermissions => typeof value === 'string'
);

export const largeTeamPermissions: ETeamPermissions[] = Object.values(ETeamPermissions).filter(
    (value): value is ETeamPermissions => typeof value === 'string'
);

export const largeSupportPermissions: ESupportPermissions[] = Object.values(ESupportPermissions).filter(
    (value): value is ESupportPermissions => typeof value === 'string'
);

// Flexible context creators
export const createContext = (
    userPermissions: EUserPermissions[] = [],
    teamPermissions: ETeamPermissions[] = [],
    supportPermissions: ESupportPermissions[] = []
) => ({
    user: userPermissions.length > 0 ? Option.some(userPermissions) : Option.none,
    team: teamPermissions.length > 0 ? Option.some(teamPermissions) : Option.none,
    support: supportPermissions.length > 0 ? Option.some(supportPermissions) : Option.none,
});

export const createUserContext = (permissions: EUserPermissions[]) => createContext(permissions);
export const createTeamContext = (permissions: ETeamPermissions[]) => createContext([], permissions);
export const createSupportContext = (permissions: ESupportPermissions[]) => createContext([], [], permissions);

export const createLargeTestContext = () => ({
    user: Option.some(largeUserPermissions),
    team: Option.some(largeTeamPermissions),
    support: Option.some(largeSupportPermissions),
});

export const createEmptyContext = () => ({
    user: Option.none,
    team: Option.none,
    support: Option.none,
});

// Test utilities
export const createNestedExpression = (depth: number, baseExpression: any, wrapper: (expr: any) => any) => {
    let expression = baseExpression;
    for (let i = 0; i < depth; i++) {
        expression = wrapper(expression);
    }
    return expression;
};

export const createDeepAndExpression = (depth: number) => {
    let expression: any = (context: any) => true;
    for (let i = 0; i < depth; i++) {
        expression = (context: any) => expression(context) && true;
    }
    return expression;
};

export const createDeepOrExpression = (depth: number) => {
    let expression: any = (context: any) => false;
    for (let i = 0; i < depth; i++) {
        expression = (context: any) => expression(context) || false;
    }
    return expression;
};

// Performance testing utilities
export const measurePerformance = <T>(fn: () => T): { result: T; duration: number } => {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    return { result, duration: endTime - startTime };
};

// Test data generators
export const generateRandomPermissions = (count: number, enumValues: string[]): string[] => {
    const permissions: string[] = [];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * enumValues.length);
        const value = enumValues[randomIndex];
        if (value !== undefined) {
            permissions.push(value);
        }
    }
    return permissions;
};

export const generateSequentialPermissions = (count: number, enumValues: string[]): string[] => {
    return enumValues.slice(0, count).filter((value): value is string => value !== undefined);
};

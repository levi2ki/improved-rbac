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

export const createLargeTestContext = () => ({
    user: Option.some(largeUserPermissions),
    team: Option.some(largeTeamPermissions),
    support: Option.some(largeSupportPermissions),
});

// Performance testing utilities
export const measurePerformance = <T>(fn: () => T): { result: T; duration: number } => {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    return { result, duration: endTime - startTime };
};

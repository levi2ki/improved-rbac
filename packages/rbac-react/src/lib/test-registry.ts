import { pipe } from 'fp-ts/function';

import { createModule, getDefaultRegistry, register } from '@levi2ki/rbac-core';

export type AccountGrant = 'read';
export type DocumentGrant = 'read' | 'write';

export const testRegistry = pipe(
  getDefaultRegistry(),
  register(createModule<AccountGrant>()('account')),
  register(createModule<DocumentGrant>()('document')),
);

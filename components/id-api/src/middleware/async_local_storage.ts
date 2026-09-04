import { asyncLocalStorageMiddleware } from '@liquio/back-core';

import { Express } from '../types';

export function useAsyncLocalStorage(express: Express) {
  express.use(asyncLocalStorageMiddleware as any);
}

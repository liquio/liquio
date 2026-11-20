// Limits and field minimisation for the `basic()` user read routes (KS-25).

// Hard page size for `GET /user` and `POST /user/info/search`. Real callers use 10 to 100 per page.
export const DEFAULT_USERS_MAX_LIMIT = 100;
// Hard size of an id/ipn/edrpou batch. Bigger than any real caller (units, mass mailings), it only bounds abuse.
export const DEFAULT_USERS_MAX_BATCH = 1000;

export interface UsersReadConfig {
  // Page size cap for every caller.
  maxLimit?: number;
  // Batch cap for `POST /user/info/{id,ipn,edrpou}` for every caller.
  maxBatch?: number;
  // Named clients that may receive `services` and run unfiltered lists. The legacy shared secret always may.
  fullReadClients?: string[];
}

export interface ReadClient {
  name: string;
  legacy: boolean;
}

export interface UsersReadPolicy {
  maxLimit: number;
  maxBatch: number;
  fullReadClients: string[];
}

const positiveInt = (value: unknown, fallback: number) => (Number.isInteger(value) && (value as number) > 0 ? (value as number) : fallback);

export function getUsersReadPolicy(config: { users?: UsersReadConfig } | undefined): UsersReadPolicy {
  const users = config?.users ?? {};
  return {
    maxLimit: positiveInt(users.maxLimit, DEFAULT_USERS_MAX_LIMIT),
    maxBatch: positiveInt(users.maxBatch, DEFAULT_USERS_MAX_BATCH),
    fullReadClients: Array.isArray(users.fullReadClients) ? users.fullReadClients : [],
  };
}

/** Non-negative integer, or the fallback when the value is missing or not a number. */
export function toNonNegativeInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Page size: the fallback when missing or invalid, never above the cap, at least 1. */
export function clampLimit(value: unknown, fallback: number, maxLimit: number): number {
  return Math.min(Math.max(toNonNegativeInt(value, fallback), 1), maxLimit);
}

export function hasFullRead(client: ReadClient | undefined, policy: UsersReadPolicy): boolean {
  return !client || client.legacy || policy.fullReadClients.includes(client.name);
}

/**
 * Copy of a user for a read response. The password hash never leaves id-api.
 * `services` (provider profiles) is kept only for clients with full read access.
 */
export function minimiseUser<T extends Record<string, any>>(user: T, fullRead: boolean): Partial<T> {
  if (!user || typeof user !== 'object') return user;
  const rest: Record<string, any> = { ...user };
  delete rest.password;
  delete rest.authorizationVersion;
  if (!fullRead) delete rest.services;
  return rest as Partial<T>;
}

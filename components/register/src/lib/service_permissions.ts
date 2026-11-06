import { Config } from './config';

/** Per-user permission entry (`auth.servicePermissions[user]`). */
export interface ServicePermission {
  /** Allowed routes, e.g. `GET /records/:id` (Express route pattern). `*` allows all routes. Missing/empty: no route is allowed. */
  routes?: string[];
  /** When set, the request must target one of these key ids; requests whose key can't be determined are denied. */
  keys?: Array<number | string>;
}

/** Routes that change or destroy data irreversibly. In `auth.strict` mode they need `auth.trustedCallers`. */
export const DESTRUCTIVE_ROUTES = [
  'POST /rollback/start',
  'POST /rollback/record',
  'DELETE /registers/:id',
  'DELETE /keys/:id',
  'DELETE /records/bulk',
  'DELETE /records/:id',
];

export interface PermissionRequest {
  method: string;
  url: string;
  route?: { path?: string };
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: any;
}

export interface PermissionDecision {
  allowed: boolean;
  reason?: string;
  /** Route name used for the decision, e.g. `GET /records`. */
  route: string;
}

type Auth = Config['auth'];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validate `auth.servicePermissions` / `auth.strict`. Returns problems (setting names only). */
export function checkServicePermissionsConfig(auth: Auth | undefined): string[] {
  const problems: string[] = [];
  const permissions = auth?.servicePermissions;
  if (auth?.strict !== undefined && typeof auth.strict !== 'boolean') {
    problems.push('auth.strict must be a boolean.');
  }
  if (permissions === undefined || permissions === null) return problems;
  if (!isObject(permissions)) return [...problems, 'auth.servicePermissions must be an object.'];

  for (const [user, entry] of Object.entries(permissions)) {
    const name = `auth.servicePermissions.${user}`;
    if (!isObject(entry)) {
      problems.push(`${name} must be an object.`);
      continue;
    }
    const { routes, keys } = entry as ServicePermission;
    if (routes !== undefined && (!Array.isArray(routes) || !routes.every((r) => typeof r === 'string'))) {
      problems.push(`${name}.routes must be an array of strings.`);
    }
    if (keys !== undefined && (!Array.isArray(keys) || !keys.every((k) => typeof k === 'string' || typeof k === 'number'))) {
      problems.push(`${name}.keys must be an array of key ids.`);
    }
  }
  return problems;
}

/** Basic users from `auth.tokens` that have neither a permission entry nor `limitedAccess`, i.e. full access. */
export function listUnrestrictedUsers(auth: Auth | undefined): string[] {
  const users = new Set<string>();
  for (const token of auth?.tokens || []) {
    if (typeof token !== 'string') continue;
    const [keyword, base64] = token.split(' ');
    if (keyword !== 'Basic' || !base64) continue;
    const parts = Buffer.from(base64, 'base64').toString('utf8').split(':');
    if (parts.length === 2) users.add(parts[0]);
  }
  const permissions = isObject(auth?.servicePermissions) ? auth.servicePermissions : {};
  const limited = (auth?.limitedAccess || []).map((v) => v.user);
  return [...users].filter((user) => !Object.prototype.hasOwnProperty.call(permissions, user) && !limited.includes(user));
}

function requestedKey(req: PermissionRequest, route: string): string | undefined {
  const path = route.split(' ')[1] || '';
  const candidate = path.startsWith('/keys/:id') ? req.params?.id : (req.query?.key_id ?? req.body?.key_id ?? req.body?.keyId);
  return candidate === undefined || candidate === null || Array.isArray(candidate) || typeof candidate === 'object' ? undefined : `${candidate}`;
}

/**
 * Decide whether a Basic user may call the matched route. Opt-in:
 * a user without a `servicePermissions` entry is unrestricted, except for destructive routes in `auth.strict` mode,
 * which then need `auth.trustedCallers`.
 */
export function authorizeRequest(auth: Auth, user: string, req: PermissionRequest): PermissionDecision {
  const path = req.route?.path ?? req.url.split('?')[0];
  const route = `${req.method.toUpperCase()} ${path}`;
  const permissions = isObject(auth?.servicePermissions) ? auth.servicePermissions : {};
  const entry = Object.prototype.hasOwnProperty.call(permissions, user) ? (permissions[user] as ServicePermission) : undefined;

  if (auth?.strict === true && DESTRUCTIVE_ROUTES.includes(route) && !auth.trustedCallers?.includes(user)) {
    return { allowed: false, reason: 'destructive-route-requires-trusted-caller', route };
  }
  if (!entry) return { allowed: true, route };

  const routes = entry.routes || [];
  if (!routes.includes('*') && !routes.includes(route)) {
    return { allowed: false, reason: 'route-not-allowed', route };
  }
  if (entry.keys) {
    const key = requestedKey(req, route);
    if (key === undefined || !entry.keys.map((k) => `${k}`).includes(key)) {
      return { allowed: false, reason: 'key-not-allowed', route };
    }
  }
  return { allowed: true, route };
}

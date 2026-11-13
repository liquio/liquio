import { Config } from './config';

export interface RequestedSecurityFlags {
  allow_see_all_records?: unknown;
  disable_fields_rules?: unknown;
  allow_tokens?: unknown;
}

export interface CallerAccess {
  /** True when the Basic user is listed in `auth.trustedCallers`. */
  trusted: boolean;
  allowSeeAll: boolean;
  disableFieldsRules: boolean;
  allowTokens: string[];
  /** Names of client-supplied flags that were dropped because the caller is untrusted. */
  ignoredFlags: string[];
}

const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Strict boolean parsing: only `true` and `'true'` are truthy ('false', '0', '' etc. are not).
 */
export function parseStrictBoolean(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

function decodeRequestedTokens(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => decodeURIComponent(v)) : [];
}

function getServerAllowTokens(config: Pick<Config, 'auth'>, user: string | undefined): string[] {
  const map = config?.auth?.userAllowTokens;
  if (map === undefined || map === null) return [];
  if (typeof map !== 'object' || Array.isArray(map)) {
    throw new Error('Invalid config: auth.userAllowTokens must be an object.');
  }
  if (!user || !hasOwn(map, user)) return [];
  const tokens = map[user];
  if (!Array.isArray(tokens) || !tokens.every((t) => typeof t === 'string')) {
    throw new Error('Invalid config: auth.userAllowTokens entries must be arrays of strings.');
  }
  return [...tokens];
}

/**
 * Resolve effective record security flags for the caller.
 * Client-supplied flags are honoured only for users listed in `auth.trustedCallers`.
 * Everyone else gets no "see all" rights and only the server-side tokens from `auth.userAllowTokens`.
 * Throws on malformed config (callers must fail the request without returning data).
 */
export function resolveCallerAccess(
  req: { auth?: { user?: string } },
  config: Pick<Config, 'auth'>,
  requested: RequestedSecurityFlags = {},
): CallerAccess {
  const user = req?.auth?.user;
  const trustedCallers = config?.auth?.trustedCallers;
  if (
    trustedCallers !== undefined &&
    trustedCallers !== null &&
    (!Array.isArray(trustedCallers) || !trustedCallers.every((u) => typeof u === 'string'))
  ) {
    throw new Error('Invalid config: auth.trustedCallers must be an array of strings.');
  }

  if (user && trustedCallers && trustedCallers.includes(user)) {
    return {
      trusted: true,
      allowSeeAll: parseStrictBoolean(requested.allow_see_all_records),
      disableFieldsRules: parseStrictBoolean(requested.disable_fields_rules),
      allowTokens: decodeRequestedTokens(requested.allow_tokens),
      ignoredFlags: [],
    };
  }

  const ignoredFlags = (['allow_see_all_records', 'disable_fields_rules', 'allow_tokens'] as const).filter(
    (name) => requested[name] !== undefined && requested[name] !== null,
  );
  return {
    trusted: false,
    allowSeeAll: false,
    disableFieldsRules: false,
    allowTokens: getServerAllowTokens(config, user),
    ignoredFlags,
  };
}

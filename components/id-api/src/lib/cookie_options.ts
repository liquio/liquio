import { CookieOptions, Request } from 'express';

import { Config, DEFAULT_COOKIE_DOMAIN } from '../config';

type CookieSettings = NonNullable<Config['cookies']>;

/**
 * Cookie `Secure` attribute. `auto` (default) follows the request protocol: it is `true` for HTTPS requests
 * (including requests behind a TLS-terminating ingress when `trustProxy` is configured) and `false` for plain HTTP,
 * so local http development keeps working.
 */
export function resolveSecure(config: Pick<Config, 'cookies'>): boolean | 'auto' {
  const secure = config.cookies?.secure;
  return secure === undefined ? 'auto' : secure;
}

/**
 * SameSite defaults to `lax`: the session cookie must be sent on the top-level redirect back from external
 * identity providers (OAuth/OIDC), which `strict` would break.
 */
export function resolveSameSite(config: Pick<Config, 'cookies'>): NonNullable<CookieSettings['sameSite']> {
  return config.cookies?.sameSite ?? 'lax';
}

/**
 * Options for the `jwt` (user profile) and `client_id` cookies set via `res.cookie`.
 * `jwt` stays readable by JavaScript unless `cookies.profileHttpOnly` is enabled, since front-ends read it.
 */
export function profileCookieOptions(
  req: Pick<Request, 'secure'>,
  config: Pick<Config, 'cookies' | 'domain'>,
  extra: CookieOptions = {},
): CookieOptions {
  const secure = resolveSecure(config);
  return {
    domain: config.domain ?? DEFAULT_COOKIE_DOMAIN,
    secure: secure === 'auto' ? !!req.secure : secure,
    sameSite: resolveSameSite(config),
    httpOnly: config.cookies?.profileHttpOnly ?? false,
    ...extra,
  };
}

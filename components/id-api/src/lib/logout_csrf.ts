import crypto from 'crypto';

import { Request } from 'express';

const SAME_SITE_FETCH_SITES = ['same-origin', 'same-site', 'none'];

export const LOGOUT_CSRF_FIELD = '_csrf';

function hostOf(value: string | undefined): string | undefined {
  if (!value || value === 'null') {
    return undefined;
  }

  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return undefined;
  }
}

function hostMatches(host: string, trusted: string): boolean {
  const hostname = host.replace(/:\d+$/, '');
  const trustedName = trusted.toLowerCase();

  // A cookie-style domain (`.example.com`) trusts the domain itself and all its subdomains.
  if (trustedName.startsWith('.')) {
    return hostname === trustedName.slice(1) || hostname.endsWith(trustedName);
  }

  return host === trustedName;
}

/**
 * Decide whether a request comes from our own front-ends (same-site navigation).
 * `Sec-Fetch-Site` is authoritative when present (`none` is a user-typed URL or a bookmark). Without it (old browsers,
 * non-browser clients) fall back to the Origin/Referer host against the trusted hosts. No proof at all means unverifiable.
 */
export function isSameSiteRequest(req: Pick<Request, 'get'>, trustedHosts: string[]): boolean {
  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite) {
    return SAME_SITE_FETCH_SITES.includes(fetchSite.toLowerCase());
  }

  const origin = req.get('origin');
  const sourceHost = origin ? hostOf(origin) : hostOf(req.get('referer'));

  return !!sourceHost && trustedHosts.some((trusted) => hostMatches(sourceHost, trusted));
}

/**
 * Hosts a logout may be initiated from: this server, the cookie domain, CORS origins and the registered redirect URIs.
 */
export function collectTrustedHosts(
  ownHost: string | undefined,
  options: { domain?: string; origins?: string[]; redirectUris?: string[] },
): string[] {
  const hosts = new Set<string>();

  if (ownHost) hosts.add(ownHost.toLowerCase());
  if (options.domain) hosts.add(options.domain.toLowerCase());

  for (const value of [...(options.origins ?? []), ...(options.redirectUris ?? [])]) {
    const host = hostOf(value);
    if (host) hosts.add(host);
  }

  return [...hosts];
}

/** Session-bound anti-CSRF token for the logout confirmation form. */
export function getLogoutCsrfToken(session: Record<string, any>): string {
  if (typeof session.logoutCsrfToken !== 'string' || !session.logoutCsrfToken) {
    session.logoutCsrfToken = crypto.randomBytes(32).toString('hex');
  }

  return session.logoutCsrfToken;
}

export function isValidLogoutCsrfToken(session: Record<string, any> | undefined, token: unknown): boolean {
  const expected = session?.logoutCsrfToken;
  if (typeof expected !== 'string' || !expected || typeof token !== 'string') {
    return false;
  }

  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Confirmation page: the logout is performed only by the POST of this form. */
export function renderLogoutConfirmation(csrfToken: string, redirectUri?: string): string {
  const action = redirectUri ? `/logout?redirect_uri=${encodeURIComponent(redirectUri)}` : '/logout';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Sign out</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
<form method="post" action="${escapeHtml(action)}">
<p>Do you want to sign out?</p>
<input type="hidden" name="${LOGOUT_CSRF_FIELD}" value="${escapeHtml(csrfToken)}">
<button type="submit">Sign out</button>
</form>
</body>
</html>
`;
}

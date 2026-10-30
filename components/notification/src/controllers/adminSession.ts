import crypto from 'node:crypto';

import { getConf } from '../lib/context';

export const ADMIN_COOKIE_NAME = 'adminSid';
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const LOGIN_MAX_FAILURES = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// In-memory stores: sessions are per process (a restart or another replica requires a new login).
const sessions = new Map<string, { expiresAt: number }>();
const failures = new Map<string, { count: number; resetAt: number }>();

const digest = (value: unknown): Buffer =>
  crypto
    .createHash('sha256')
    .update(String(value ?? ''))
    .digest();

/**
 * Constant-time check of the submitted admin credentials against config.
 */
export function verifyAdminCredentials(login: unknown, pass: unknown): boolean {
  const { login: confLogin, password: confPassword } = getConf()?.adminConfig || {};
  if (!confLogin || !confPassword) return false;
  const loginOk = crypto.timingSafeEqual(digest(login), digest(confLogin));
  const passOk = crypto.timingSafeEqual(digest(pass), digest(confPassword));
  return loginOk && passOk;
}

/**
 * Create a new random session (a new id is issued on every login).
 */
export function createAdminSession(): string {
  const now = Date.now();
  for (const [id, { expiresAt }] of sessions) if (expiresAt <= now) sessions.delete(id);
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, { expiresAt: now + ADMIN_SESSION_TTL_MS });
  return id;
}

/**
 * Shared verifier for every admin cookie check: a known, unexpired server-side session.
 */
export function verifyAdminSession(req: any): boolean {
  const id = req.cookies?.[ADMIN_COOKIE_NAME];
  if (typeof id !== 'string' || !id) return false;
  const session = sessions.get(id);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return false;
  }
  return true;
}

export function destroyAdminSession(req: any): void {
  const id = req.cookies?.[ADMIN_COOKIE_NAME];
  if (typeof id === 'string') sessions.delete(id);
}

export function adminCookieOptions(req: any): any {
  const forwardedProto = String(req.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  return {
    path: '/admin',
    httpOnly: true,
    sameSite: 'strict',
    secure: Boolean(req.secure || forwardedProto === 'https'),
  };
}

/**
 * Failed-login rate limit per client IP. Returns true when the client is blocked.
 */
export function isLoginBlocked(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILURES;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || entry.resetAt <= now) failures.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  else entry.count += 1;
}

export function resetLoginFailures(ip: string): void {
  failures.delete(ip);
}

export function clearAdminSessionsForTests(): void {
  sessions.clear();
  failures.clear();
}

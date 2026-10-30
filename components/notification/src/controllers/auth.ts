import crypto from 'node:crypto';

import { appendTraceMeta } from '@liquio/back-core';

import { AuthorizeModel } from '../models/authorize';
import { verifyAdminSession } from './adminSession';
import { getConf } from '../lib/context';

const Authorize = new AuthorizeModel().Authorize;

function sendAuthError(res: any, code = 'Authorization error', message = 'Authorization empty'): void {
  res.send(401, { code, message });
}

const checkAuth = async function (req: any, res: any, next: any) {
  const { authorization: authConfig = {} } = getConf();
  const { authorization = '' } = req.headers;

  if (!authorization.trim()) {
    return sendAuthError(res);
  }

  const [authType, authData] = authorization.split(' ');
  if (!authData || authType !== 'Basic') {
    return sendAuthError(res);
  }

  let decodedAuthData;
  try {
    decodedAuthData = Buffer.from(authData, 'base64').toString('utf8');
  } catch {
    return sendAuthError(res, undefined, 'Authorization token not valid');
  }

  const separatorIndex = decodedAuthData.indexOf(':');
  if (separatorIndex === -1) {
    return sendAuthError(res, undefined, 'Authorization token not valid');
  }

  const login = decodedAuthData.slice(0, separatorIndex);
  const pass = decodedAuthData.slice(separatorIndex + 1);
  if (!pass) {
    return sendAuthError(res, undefined, 'Password not match');
  }

  let existedClient;
  if (authConfig.list && Array.isArray(authConfig.list)) {
    existedClient = authConfig.list.find(({ user, password }: any) => user === login && pass === password);
  } else {
    const hmacLogin = crypto.createHmac('sha512', login).update(pass).digest('hex').toUpperCase();
    existedClient = await Authorize.findOne({ where: { login: hmacLogin, password: pass } });
  }

  if (!existedClient) {
    return sendAuthError(res, undefined, 'User not match');
  }

  next();
};

/**
 * Check admin panel session cookie (same server-side session staticRoutes issues on login, revoked on logout).
 * Lets the admin UI call service routes without any Basic credentials in client-side code.
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next handler.
 */
const checkAdminCookie = function (req: any, res: any, next: any) {
  if (!verifyAdminSession(req)) {
    return sendAuthError(res);
  }

  next();
};

/**
 * Reject browser requests sent from another origin (CSRF guard for cookie-authenticated admin API).
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next handler.
 */
const checkSameOrigin = function (req: any, res: any, next: any) {
  const { origin, host, 'x-forwarded-host': forwardedHost } = req.headers;
  if (origin) {
    let originHost: string | null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== (forwardedHost || host)) {
      return res.send(403, { code: 'Forbidden', message: 'Origin not allowed' });
    }
  }

  next();
};

/**
 * Check test auth.
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next handler.
 */
const checkTestAuth = async function (req: any, res: any, next: any) {
  // Define params.
  const testAuthToken = req.headers.authorization;
  const conf = getConf();
  const neededTestAuthToken = conf && conf.testService && conf.testService.token;

  // Check.
  if (!neededTestAuthToken) {
    return sendAuthError(res, undefined, 'Test auth token not defined in config.');
  }
  if (testAuthToken !== neededTestAuthToken) {
    return sendAuthError(res, undefined, 'Test auth token not match.');
  }

  // Go to next handler.
  next();
};

const DIGEST_REALM = 'Digest Authenticatoin';
const NONCE_TTL_MS = 5 * 60 * 1000;
const DIGEST_FIELDS = ['username', 'nonce', 'nc', 'cnonce', 'qop', 'uri', 'response'];

// Fallback signing key for nonces when no admin password is configured (nonces then are valid per process only).
const processNonceKey = crypto.randomBytes(32).toString('hex');
// Last accepted "nc" per nonce (replay protection, per process).
const nonceCounters = new Map<string, { count: number; expires: number }>();

function cryptoUsingMD5(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

function safeEqual(a: unknown, b: unknown): boolean {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

function signNonce(value: string): string {
  const key = String(getConf()?.adminConfig?.password || processNonceKey);
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

// Stateless nonce: timestamp.random.signature (the signature proves the server issued it, the timestamp bounds its life).
function generateNonce(): string {
  const value = `${Date.now().toString(16)}.${crypto.randomBytes(16).toString('hex')}`;
  return `${value}.${signNonce(value)}`;
}

function isNonceValid(nonce: string): boolean {
  const [timestamp, random, signature] = String(nonce).split('.');
  if (!timestamp || !random || !signature || !safeEqual(signature, signNonce(`${timestamp}.${random}`))) {
    return false;
  }
  const age = Date.now() - parseInt(timestamp, 16);
  return age >= 0 && age <= NONCE_TTL_MS;
}

function registerNonceCount(nonce: string, nc: string): boolean {
  const now = Date.now();
  for (const [key, { expires }] of nonceCounters) if (expires < now) nonceCounters.delete(key);

  if (!/^[0-9a-f]{1,8}$/i.test(nc)) return false;
  const count = parseInt(nc, 16);
  const { count: lastCount = 0 } = nonceCounters.get(nonce) || {};
  if (count <= lastCount) return false;

  nonceCounters.set(nonce, { count, expires: now + NONCE_TTL_MS });
  return true;
}

function normalizeUri(uri: string): string {
  const [path, ...query] = String(uri).split('?');
  return `${path.replace(/\/+/g, '/').replace(/(.)\/$/, '$1')}?${query.join('?')}`;
}

function parseAuthenticationInfo(authData: string): Record<string, string> {
  const authenticationObj: Record<string, string> = {};
  for (const [, key, quotedValue, value] of authData.matchAll(/(\w+)=(?:"([^"]*)"|([^,\s]*))/g)) {
    authenticationObj[key] = quotedValue !== undefined ? quotedValue : value;
  }
  return authenticationObj;
}

function sendDigestChallenge(res: any, message?: string): void {
  const opaque = cryptoUsingMD5(DIGEST_REALM);
  res.header('WWW-Authenticate', `Digest realm="${DIGEST_REALM}",qop="auth",nonce="${generateNonce()}",opaque="${opaque}"`);
  return sendAuthError(res, undefined, message);
}

async function login(request: any, res: any): Promise<boolean> {
  const { authorization } = request.headers;
  if (!authorization || !/^Digest /i.test(authorization)) {
    sendDigestChallenge(res);
    return false;
  }

  const authInfo = parseAuthenticationInfo(authorization.replace(/^Digest /i, ''));
  if (DIGEST_FIELDS.some((field) => !authInfo[field]) || authInfo.qop !== 'auth') {
    sendDigestChallenge(res, 'Not valid authorization params');
    return false;
  }
  const { username, nonce, nc, cnonce, qop, uri, response } = authInfo;

  if (!isNonceValid(nonce)) {
    sendDigestChallenge(res, 'Nonce not valid or expired');
    return false;
  }
  // The signed uri must be the one actually requested, not any value the client chooses.
  if (normalizeUri(uri) !== normalizeUri(request.originalUrl || request.url)) {
    sendDigestChallenge(res, 'Not valid uri');
    return false;
  }

  const client = await Authorize.findOne({ where: { login: username } });
  if (!client) {
    sendDigestChallenge(res, 'Not valid login');
    return false;
  }

  const ha1 = cryptoUsingMD5(`${username}:${DIGEST_REALM}:${client.password}`);
  const ha2 = cryptoUsingMD5(`${request.method}:${uri}`);
  const expected = cryptoUsingMD5([ha1, nonce, nc, cnonce, qop, ha2].join(':'));
  if (!safeEqual(response, expected)) {
    sendDigestChallenge(res, 'Not valid password');
    return false;
  }

  // Count only a correctly signed request, so a forged header cannot burn a legitimate nonce counter.
  if (!registerNonceCount(nonce, nc)) {
    sendDigestChallenge(res, 'Nonce count not valid');
    return false;
  }

  appendTraceMeta({ login: username });
  return true;
}

function clearDigestNoncesForTests(): void {
  nonceCounters.clear();
}

const checkConfigAuth = async function (req: any, res: any, next: any) {
  if (await login(req, res)) next();
};

export { checkAuth, checkTestAuth, checkConfigAuth, checkAdminCookie, checkSameOrigin, clearDigestNoncesForTests };

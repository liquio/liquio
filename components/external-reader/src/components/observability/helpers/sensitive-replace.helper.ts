/**
 * Built-in sensitive key names. Compared in a normalized form: split into words on "_", "-", "." and
 * camelCase boundaries, lower-cased and joined without separators, so `access_token`, `accessToken`,
 * `ACCESS-TOKEN` and `accesstoken` are all the same key. A key is sensitive when the whole key or any
 * trailing run of its words is in the list (`newPassword`, `x-api-key`, `csrf_token`), but never a
 * mere substring (`design`, `shipping`, `tokenType`).
 */
export const DEFAULT_SENSITIVE_KEYS: readonly string[] = [
  'password',
  'passwd',
  'passphrase',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'authorization',
  'proxyauthorization',
  'cookie',
  'setcookie',
  'secret',
  'secretkey',
  'privatekey',
  'clientsecret',
  'apikey',
  'otp',
  'pin',
  'sign',
  'signature',
];

/**
 * "code" is only sensitive when it is clearly a confirmation code: a qualified key (`sms_code`, `confirmationCode`,
 * `otp_code`, `authCode`) always, a bare `code` only when the value does not look like an error/status code
 * (see `isBareCodeSensitive`), because `code` is also used for `ECONNREFUSED`, HTTP statuses, etc.
 */
const CODE_QUALIFIERS = new Set([
  'confirm',
  'confirmation',
  'verification',
  'verify',
  'sms',
  'otp',
  'auth',
  'authorization',
  'activation',
  'security',
  'twofactor',
  '2fa',
  'mfa',
  'pin',
]);

const MASK_CACHE_LIMIT = 2000;

type KeyMatcher = {
  compact: Set<string>;
  regexes: RegExp[];
};

type KeyKind = 'none' | 'always' | 'bareCode';

const wordsOf = (key: string): string[] =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const matcherCache = new Map<string, { matcher: KeyMatcher; kinds: Map<string, KeyKind> }>();

const buildMatcher = (excludeParams: string[], useDefaults: boolean): KeyMatcher => {
  const compact = new Set<string>(useDefaults ? DEFAULT_SENSITIVE_KEYS : []);
  const regexes: RegExp[] = [];
  for (const raw of excludeParams) {
    if (typeof raw !== 'string' || !raw) continue;
    const param = raw.endsWith('=') ? raw.slice(0, -1) : raw;
    if (/^[\w.-]+$/.test(param)) {
      const name = wordsOf(param).join('');
      if (name) compact.add(name);
    } else {
      // Not a plain name: legacy configs could pass a regex fragment, keep matching it against the raw key.
      try {
        regexes.push(new RegExp(`^(?:${param})$`, 'i'));
      } catch {
        // Ignore invalid patterns.
      }
    }
  }
  return { compact, regexes };
};

const classify = (matcher: KeyMatcher, key: string): KeyKind => {
  const words = wordsOf(key);
  for (let i = 0; i < words.length; i++) {
    if (matcher.compact.has(words.slice(i).join(''))) return 'always';
  }
  if (matcher.regexes.some((regex) => regex.test(key))) return 'always';
  const last = words.length - 1;
  if (last >= 0 && words[last] === 'code') {
    if (last === 0) return 'bareCode';
    if (CODE_QUALIFIERS.has(words[last - 1])) return 'always';
  }
  return 'none';
};

const getClassifier = (excludeParams: string[], useDefaults: boolean) => {
  const cacheKey = `${useDefaults ? 1 : 0}|${excludeParams.join('\u0000')}`;
  let entry = matcherCache.get(cacheKey);
  if (!entry) {
    if (matcherCache.size > 50) matcherCache.clear();
    entry = { matcher: buildMatcher(excludeParams, useDefaults), kinds: new Map() };
    matcherCache.set(cacheKey, entry);
  }
  const { matcher, kinds } = entry;
  return (key: string): KeyKind => {
    let kind = kinds.get(key);
    if (kind === undefined) {
      kind = classify(matcher, key);
      if (kinds.size >= MASK_CACHE_LIMIT) kinds.clear();
      kinds.set(key, kind);
    }
    return kind;
  };
};

/**
 * A bare `code` value is masked unless it looks like an error or status code: an UPPER_SNAKE identifier
 * (`ECONNREFUSED`, `ERR_INVALID_ARG`), or a number/string of up to 3 digits (HTTP status). Anything else
 * (e.g. `123456`, `4/0AX4XfW...`) is treated as a confirmation/authorization code.
 * Known false positive: 5-digit Postgres SQLSTATE codes (`23505`) are masked.
 */
const isBareCodeSensitive = (value: string): boolean => {
  const text = value.replace(/^\\?"|\\?"$/g, '');
  if (!text || text === 'null') return false;
  if (/^[A-Z][A-Z0-9_]*$/.test(text)) return false;
  if (/^\d{1,3}$/.test(text)) return false;
  return true;
};

/** Returns the index right after the JSON value starting at `start`. */
const findValueEnd = (str: string, start: number, escaped: boolean): number => {
  const first = str[start];
  const quote = escaped ? '\\"' : '"';
  if (str.startsWith(quote, start)) {
    let i = start + quote.length;
    while (i < str.length) {
      if (escaped) {
        if (str[i] === '\\' && str[i + 1] === '"') return i + 2;
        if (str[i] === '\\') i += 2;
        else i++;
      } else {
        if (str[i] === '\\') i += 2;
        else if (str[i] === '"') return i + 1;
        else i++;
      }
    }
    return str.length;
  }
  if (first === '{' || first === '[') {
    let depth = 0;
    let inString = false;
    for (let i = start; i < str.length; i++) {
      const ch = str[i];
      if (ch === '\\') {
        // Plain mode: skip the escaped char. Escaped mode: quotes are `\"`, so treat `\"` as a quote toggle.
        if (escaped && str[i + 1] === '"') inString = !inString;
        i++;
      } else if (!escaped && ch === '"') {
        inString = !inString;
      } else if (!inString) {
        if (ch === '{' || ch === '[') depth++;
        else if (ch === '}' || ch === ']') {
          depth--;
          if (depth === 0) return i + 1;
        }
      }
    }
    return str.length;
  }
  let i = start;
  while (i < str.length && !/[,}\]\s\\]/.test(str[i])) i++;
  return i;
};

const JSON_KEY_REGEX = /(\\?)"([^"\\]{1,100})\\?"[ \t]*:[ \t]*/g;
const QUERY_PARAM_REGEX = /([^\s"'&?=#;\\/:]{1,100})=([^&#"'\s\\]*)/g;

/**
 * Sensitive properties replace.
 *
 * Masks:
 *  - values of any JSON type (string, number, boolean, object, array) under a sensitive key in a serialized JSON
 *    string, at any nesting depth, including JSON embedded in string values;
 *  - values of sensitive query/form parameters (`?token=abc&x=1`) inside any string.
 *
 * Sensitive keys are the built-in `DEFAULT_SENSITIVE_KEYS` (password, token, secret, authorization, cookie, api key,
 * otp, pin, signature, confirmation codes...) plus the entries of `excludeParams` (extend, never replace). Keys match
 * case-insensitively across snake_case, kebab-case and camelCase. A trailing "=" in an `excludeParams` entry
 * (legacy query-parameter syntax, e.g. "client_secret=") is accepted and ignored.
 * Set `options.disableDefaults` to use only `excludeParams` (operators who need raw logs).
 * @param {string} targetObject
 * @param {array} excludeParams
 * @param {string} replaceMask
 * @param {object} [options]
 * @returns
 */
export const sensitiveReplace = (
  targetObject,
  excludeParams: string[] = [],
  replaceMask = '****',
  options: { disableDefaults?: boolean } = {},
): any => {
  if (typeof targetObject !== 'string') {
    return targetObject;
  }
  const params = Array.isArray(excludeParams) ? excludeParams : [];
  const useDefaults = !options?.disableDefaults;
  if (!useDefaults && !params.length) {
    return targetObject;
  }

  const classifyKey = getClassifier(params, useDefaults);
  const quotedMask = JSON.stringify(replaceMask);

  // 1. JSON values.
  let result = '';
  let last = 0;
  JSON_KEY_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JSON_KEY_REGEX.exec(targetObject)) !== null) {
    const kind = classifyKey(match[2]);
    if (kind === 'none') continue;
    const escaped = match[1] === '\\';
    const valueStart = match.index + match[0].length;
    const valueEnd = findValueEnd(targetObject, valueStart, escaped);
    if (valueEnd === valueStart) continue;
    if (kind === 'bareCode' && !isBareCodeSensitive(targetObject.slice(valueStart, valueEnd))) continue;
    result += targetObject.slice(last, valueStart) + (escaped ? `\\"${replaceMask}\\"` : quotedMask);
    last = valueEnd;
    JSON_KEY_REGEX.lastIndex = valueEnd;
  }
  result += targetObject.slice(last);

  // 2. Query / form parameters.
  if (result.includes('=')) {
    result = result.replace(QUERY_PARAM_REGEX, (whole, key: string, value: string) => {
      if (!value) return whole;
      const kind = classifyKey(key);
      if (kind === 'none') return whole;
      return `${key}=${replaceMask}`;
    });
  }

  return result;
};

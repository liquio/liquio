// Path filter for the catch-all proxy (`discovery.mainProxy`). cabinet-api is internet-facing, task is not:
// service-to-service and debug routes of task must never be reachable through the proxy.

export interface MainProxyFilterConfig {
  mainProxyDenyPaths?: string[]; // Extra prefixes to deny, added to the built-in list.
  // Optional allow-list; when set, everything else is denied. `'default'` selects `CABINET_FRONT_PROXY_PATHS`, an explicit
  // array replaces the built-in list, an empty array or no value disables the mode.
  mainProxyAllowPaths?: string[] | typeof ALLOW_PATHS_DEFAULT;
}

export const ALLOW_PATHS_DEFAULT = 'default';

// Denied by default. Prefixes match on a path-segment boundary (`/test` matches `/test/x`, not `/testing`).
// `/test/ping` is served by cabinet-api itself before the proxy. `/external_reader` itself is used by the cabinet
// front (data reads, cache reset, captcha widgets), so only its debug sub-path is denied.
export const DEFAULT_MAIN_PROXY_DENY_PATHS = [
  '/external_services',
  '/external-services',
  '/test',
  '/auth/bearer',
  '/external_reader/mocks-keys-by-user',
];

// Routes of `task` used by the cabinet front (components/cabinet-front + packages/front-core), audited for SE-3930 KS-05b.
// Prefixes match on a segment boundary, `:param` matches any one segment, a trailing `$` means "exactly this path".
// Not listed because cabinet-api serves them itself: /test/ping, /local/change_password, /totp/*, DELETE /user, /custom/*.
export const CABINET_FRONT_PROXY_PATHS = [
  '/auth/login', // POST. front-core actions/auth.ts:179
  '/auth/me', // GET. front-core actions/auth.ts:127
  '/redirect/auth', // GET, browser navigation. cabinet-front config `authLink`
  '/redirect/logout', // GET, browser navigation. front-core actions/auth.ts:47
  '/navigation-tree', // GET. front-core components/Auth/index.tsx:44
  '/ui-filters', // GET. cabinet-front actions/app.ts:7
  '/custom-interfaces', // GET. cabinet-front modules/home/pages/CustomInterface/index.tsx:562
  '/localization-languages$', // GET. front-core actions/localization.ts:6
  '/localization-texts$', // GET. front-core actions/localization.ts:11, cabinet-front actions/multiLang.ts:23,41
  '/dictionaries/workflow-statuses', // GET. cabinet-front actions/workflow.ts:40
  '/workflow-logs', // GET /:id. cabinet-front actions/workflow.ts:46
  '/workflows', // GET /:id. cabinet-front actions/workflow.ts:16
  '/workflow-templates', // GET, GET /:id. cabinet-front actions/workflow.ts:22,28
  '/workflow-template-categories', // GET. cabinet-front actions/workflow.ts:34
  '/task-templates', // GET /:id. cabinet-front actions/documentTemplate.ts:20
  '/document-templates', // GET, GET /:id. cabinet-front actions/documentTemplate.ts:14,26
  '/tasks', // list and /:id/*, /unread/count, /last/:workflowId/:taskTemplateId. cabinet-front actions/task.ts, endPoints/*.ts
  '/documents', // /:id and /:id/* (pdf, sign*, attachments*, calc*, validate, workflow_files*, ...). cabinet-front actions/task.ts
  '/files', // POST (upload), GET /:token. cabinet-front actions/files.ts:19,37-76
  '/protected-files', // POST, GET /keys/:keyId/records/:recordId. cabinet-front actions/task.ts:612,635
  '/registers', // GET, /keys/*, /rollback/*; POST/PUT/DELETE records. cabinet-front actions/registry.ts, endPoints/registry*.ts
  '/external_reader$', // POST. cabinet-front actions/externalReader.ts:11, front-core Dialog.tsx:1195, ExternalRegister.tsx:312
  '/external_reader/cache', // DELETE. cabinet-front actions/task.ts:851
  '/external_reader/captcha', // GET /providers/list, GET /:service/:method. cabinet-front actions/task.ts:898,906
  '/messages', // GET, /count-unread, PUT /state, PUT /:id/decrypt. cabinet-front actions/messages.ts
  '/important-messages', // PUT /:id/hide. cabinet-front layouts/components/ImportantMessages.tsx:68
  '/user-inboxes', // GET, /unread/count, PUT /:id/is-read. cabinet-front actions/inbox.ts, endPoints/inboxFiles.ts
  '/units$', // GET. front-core actions/auth.ts:138
  '/units/all$', // GET. front-core actions/auth.ts:144
  '/units/:id/as-head$', // GET. cabinet-front actions/users.ts:16
  '/units/:id/requested-members$', // POST. cabinet-front actions/users.ts:19
  '/units/:id/members$', // DELETE. cabinet-front actions/users.ts:28
  '/users$', // PUT. front-core actions/auth.ts:217
  '/users/search$', // POST. cabinet-front actions/users.ts:37
  '/users/two_factor_auth$', // GET, POST. front-core actions/auth.ts:247,259
  '/users/phone', // /already_used, /send_sms_for_phone_verification, /verify. front-core actions/auth.ts:251-271
  '/users/email', // /change, /check, /confirm, /check_email_confirmation_code. front-core actions/auth.ts:279-299
  '/user-settings$', // GET, POST. front-core actions/auth.ts:150, components/UserSettings/useUserSettings.ts:14
  '/kyc', // POST /:provider, PUT|GET /:provider/:id. front-core actions/stripe.ts
  '/payment', // POST /:customer/confirm_code, GET /receipt (cabinet-front actions/task.ts:97,138); GET|POST /:customer/:status are provider callbacks
  '/validate_apple_pay_session$', // POST. cabinet-front actions/task.ts:845
  '/healthz$', // GET, infrastructure monitoring (not the front)
];

const MAX_DECODE_ROUNDS = 3;
const ENCODED_SEPARATOR = /%2f|%5c|%00/i;

/**
 * Normalise a request path for matching.
 * @param reqPath Request path (query string is stripped if present).
 * @returns Lower-cased path without `//` and trailing slash, or null if the path is malformed or suspicious
 * (encoded slash/backslash, null byte, `.`/`..` segment, bad escape, deeply nested encoding).
 */
export function normalizeProxyPath(reqPath: string): string | null {
  if (typeof reqPath !== 'string') {
    return null;
  }
  let current = reqPath.split(/[?#]/, 1)[0];
  for (let round = 0; ; round++) {
    if (ENCODED_SEPARATOR.test(current) || /[\\\0]/.test(current)) {
      return null;
    }
    if (!current.includes('%')) {
      break;
    }
    if (round >= MAX_DECODE_ROUNDS) {
      return null;
    }
    try {
      current = decodeURIComponent(current);
    } catch {
      return null;
    }
  }
  const segments = current.toLowerCase().split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }
  const normalized = '/' + segments.filter(Boolean).join('/');
  return normalized;
}

function matchesPrefix(path: string, prefix: string): boolean {
  const exact = prefix.endsWith('$');
  const pathSegments = path.split('/').filter(Boolean);
  const prefixSegments = (exact ? prefix.slice(0, -1) : prefix).toLowerCase().split('/').filter(Boolean);
  return (
    (exact ? prefixSegments.length === pathSegments.length : prefixSegments.length <= pathSegments.length) &&
    prefixSegments.every((segment, i) => (segment.startsWith(':') && segment.length > 1 ? true : segment === pathSegments[i]))
  );
}

/**
 * Decide whether a request may be forwarded to the main proxy.
 * @param _method HTTP method (reserved, rules are path-based).
 * @param reqPath Request path.
 * @param cfg Discovery config.
 * @returns True if the request may be proxied.
 */
export function isMainProxyPathAllowed(_method: string, reqPath: string, cfg: MainProxyFilterConfig = {}): boolean {
  const path = normalizeProxyPath(reqPath);
  if (path === null) {
    return false;
  }
  const denyPaths = [...DEFAULT_MAIN_PROXY_DENY_PATHS, ...(cfg.mainProxyDenyPaths ?? [])];
  if (denyPaths.some((prefix) => matchesPrefix(path, prefix))) {
    return false;
  }
  const allowPaths = cfg.mainProxyAllowPaths === ALLOW_PATHS_DEFAULT ? CABINET_FRONT_PROXY_PATHS : cfg.mainProxyAllowPaths;
  if (Array.isArray(allowPaths) && allowPaths.length > 0) {
    return allowPaths.some((prefix) => matchesPrefix(path, prefix));
  }
  return true;
}

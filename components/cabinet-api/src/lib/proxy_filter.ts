// Path filter for the catch-all proxy (`discovery.mainProxy`). cabinet-api is internet-facing, task is not:
// service-to-service and debug routes of task must never be reachable through the proxy.

export interface MainProxyFilterConfig {
  mainProxyDenyPaths?: string[]; // Extra prefixes to deny, added to the built-in list.
  // Optional allow-list; when set, everything else is denied. `'default'` selects `CABINET_FRONT_PROXY_PATHS`, an explicit
  // array replaces the built-in list, an empty array or no value disables the mode.
  mainProxyAllowPaths?: ProxyPathEntry[] | typeof ALLOW_PATHS_DEFAULT;
}

// An allow-list entry. A plain string allows any method; a rule restricts the methods (HEAD is treated as GET, OPTIONS is
// allowed on any listed path as a CORS preflight) and may exclude paths that its pattern would otherwise match.
export interface ProxyPathRule {
  path: string;
  methods?: string[];
  except?: string[];
}
export type ProxyPathEntry = string | ProxyPathRule;

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

// Routes of `task` used by the cabinet front (components/cabinet-front + packages/front-core), audited for SE-3930 KS-05b/05c.
// Each entry is a path plus the methods the front sends. Matching rules: segment boundary, case-insensitive, `:param` matches
// any one segment, a trailing `$` means "exactly this path" (otherwise the path is a prefix). HEAD is treated as GET.
// Not listed because cabinet-api serves them itself: /test/ping, /local/change_password, /totp/*, DELETE /user, /custom/*.
// Datatable lists add only a query string (stripped before matching); the row actions of the task lists are DELETE /tasks/:id,
// DELETE /tasks/:id/permanent and POST /tasks/:id/recover (front-core services/dataTable/actions.ts).
export const CABINET_FRONT_PROXY_PATHS: ProxyPathEntry[] = [
  { path: '/auth/login$', methods: ['POST'] }, // front-core actions/auth.ts:179
  { path: '/auth/me$', methods: ['GET'] }, // front-core actions/auth.ts:127
  { path: '/redirect/auth$', methods: ['GET'] }, // Browser navigation. cabinet-front config `authLink`
  { path: '/redirect/logout$', methods: ['GET'] }, // Browser navigation. front-core actions/auth.ts:47
  { path: '/navigation-tree$', methods: ['GET'] }, // front-core components/Auth/index.tsx:44
  { path: '/ui-filters$', methods: ['GET'] }, // cabinet-front actions/app.ts:7
  { path: '/custom-interfaces$', methods: ['GET'] }, // cabinet-front modules/home/pages/CustomInterface/index.tsx:562
  { path: '/localization-languages$', methods: ['GET'] }, // front-core actions/localization.ts:6
  { path: '/localization-texts$', methods: ['GET'] }, // front-core actions/localization.ts:11, cabinet-front actions/multiLang.ts:23,41
  { path: '/dictionaries/workflow-statuses$', methods: ['GET'] }, // cabinet-front actions/workflow.ts:40
  { path: '/workflow-logs/:id$', methods: ['GET'] }, // cabinet-front actions/workflow.ts:46
  { path: '/workflows/:id$', methods: ['GET'] }, // cabinet-front actions/workflow.ts:16
  { path: '/workflow-templates$', methods: ['GET'] }, // cabinet-front actions/workflow.ts:22
  { path: '/workflow-templates/:id$', methods: ['GET'] }, // cabinet-front actions/workflow.ts:28
  { path: '/workflow-template-categories$', methods: ['GET'] }, // cabinet-front actions/workflow.ts:34
  { path: '/task-templates/:id$', methods: ['GET'] }, // cabinet-front actions/documentTemplate.ts:20
  { path: '/document-templates$', methods: ['GET'] }, // cabinet-front actions/documentTemplate.ts:14
  { path: '/document-templates/:id$', methods: ['GET'] }, // cabinet-front actions/documentTemplate.ts:26
  // Tasks: datatable lists (endPoints/task.ts, workflow*.ts, unitTask.ts, closed*.ts), create, row actions and the task page.
  { path: '/tasks$', methods: ['GET', 'POST'] }, // List, create. cabinet-front actions/task.ts:207
  // `except`: DELETE /tasks/expired-drafts is a different task route that `:id` would match.
  { path: '/tasks/:id$', methods: ['GET', 'DELETE'], except: ['/tasks/expired-drafts$'] }, // actions/task.ts:197,892
  { path: '/tasks/:id/permanent$', methods: ['DELETE'] }, // front-core services/dataTable/actions.ts
  { path: '/tasks/:id/recover$', methods: ['POST'] }, // front-core services/dataTable/actions.ts
  { path: '/tasks/:id/last$', methods: ['GET'] }, // actions/task.ts:663
  { path: '/tasks/last/:workflowId/:taskTemplateId$', methods: ['GET'] }, // actions/task.ts:189
  { path: '/tasks/unread/count$', methods: ['GET'] }, // actions/task.ts:694,706
  { path: '/tasks/:id/commit$', methods: ['POST'] }, // actions/task.ts:415
  { path: '/tasks/:id/assign$', methods: ['POST'] }, // actions/task.ts:90
  { path: '/tasks/:id/signers$', methods: ['PUT'] }, // actions/task.ts:652
  { path: '/tasks/:id/due-date$', methods: ['PUT'] }, // actions/task.ts:671
  { path: '/tasks/:id/meta$', methods: ['PUT'] }, // actions/task.ts:716-753
  { path: '/tasks/:id/signers/requests$', methods: ['PUT'] }, // actions/task.ts:759
  { path: '/tasks/:id/signers/apply$', methods: ['POST'] }, // actions/task.ts:779
  // Documents.
  { path: '/documents/:id$', methods: ['GET', 'PUT'] }, // actions/task.ts:223,236
  { path: '/documents/:id/pdf$', methods: ['GET', 'POST'] }, // actions/task.ts:429,456,561
  { path: '/documents/:id/large-pdf$', methods: ['POST'] }, // actions/task.ts:432
  { path: '/documents/:id/asic$', methods: ['GET'] }, // actions/task.ts:682
  { path: '/documents/:id/attachments$', methods: ['POST'] }, // Upload. actions/task.ts:485
  // `except`: GET /documents/:id/attachments/zip is a different task route that `:attachment_id` would match.
  { path: '/documents/:id/attachments/:attachmentId$', methods: ['GET', 'DELETE'], except: ['/documents/:id/attachments/zip$'] }, // actions/task.ts:524,536,583
  { path: '/documents/:id/sign$', methods: ['GET', 'POST', 'DELETE'] }, // actions/task.ts:254,277,791
  { path: '/documents/:id/sign_p7s$', methods: ['GET', 'POST'] }, // actions/task.ts:261,319
  { path: '/documents/:id/sign_additional_p7s$', methods: ['GET', 'POST'] }, // actions/task.ts:288,293
  { path: '/documents/:id/continue-sign$', methods: ['POST'] }, // actions/task.ts:857
  { path: '/documents/:id/singlesign/check$', methods: ['POST'] }, // actions/task.ts:864
  { path: '/documents/:id/multisign/check$', methods: ['POST'] }, // actions/task.ts:867
  { path: '/documents/:id/encrypt$', methods: ['GET', 'POST'] }, // actions/task.ts:305,312
  { path: '/documents/:id/sign-rejection$', methods: ['POST'] }, // actions/task.ts:335
  { path: '/documents/:id/workflow_files$', methods: ['GET'] }, // actions/task.ts:506
  { path: '/documents/:id/workflow_files_direct$', methods: ['GET'] }, // front-core JsonSchema/elements/PreviewDocumentDirect.tsx:98
  { path: '/documents/:id/calc$', methods: ['POST'] }, // actions/task.ts:153
  { path: '/documents/:id/calc_payment$', methods: ['POST'] }, // actions/task.ts:105
  { path: '/documents/:id/prepare$', methods: ['POST'] }, // actions/task.ts:842
  { path: '/documents/:id/validate$', methods: ['POST'] }, // actions/task.ts:832
  { path: '/documents/:id/external-reader/check$', methods: ['POST'] }, // actions/task.ts:800
  { path: '/documents/:id/external-reader/check/async$', methods: ['POST'] }, // actions/task.ts:800
  { path: '/documents/:id/verified-user-info$', methods: ['PUT'] }, // actions/task.ts:872
  // Files.
  { path: '/files$', methods: ['POST'] }, // Upload. cabinet-front actions/files.ts:19
  { path: '/files/:token$', methods: ['GET'] }, // Download, preview, asics. cabinet-front actions/files.ts:37-76
  { path: '/protected-files$', methods: ['POST'] }, // cabinet-front actions/task.ts:635
  { path: '/protected-files/keys/:keyId/records/:recordId$', methods: ['GET'] }, // cabinet-front actions/task.ts:612
  // Registers: datatable lists add only a query string (endPoints/registry*.ts, front-core services/dataTable/endpoints/registry.ts).
  { path: '/registers$', methods: ['GET'] }, // cabinet-front actions/registry.ts:49
  { path: '/registers/keys$', methods: ['GET'] }, // cabinet-front actions/registry.ts:56
  { path: '/registers/keys/:keyId/records$', methods: ['GET', 'POST'] }, // actions/registry.ts:71,148, createRecord
  { path: '/registers/keys/:keyId/records/filter$', methods: ['POST'] }, // actions/registry.ts:89
  // `except`: POST /records/filter is a different task route that `:recordId` would match for the other methods.
  { path: '/registers/keys/:keyId/records/:recordId$', methods: ['GET', 'PUT', 'DELETE'], except: ['/registers/keys/:keyId/records/filter$'] }, // actions/registry.ts:106, storeRecord, onRowsDelete
  { path: '/registers/keys/:keyId/records/:recordId/history$', methods: ['GET'] }, // actions/registry.ts:129, endPoints/registryKeyHistory.ts
  { path: '/registers/keys/:keyId/history$', methods: ['GET'] }, // endPoints/registryHistory.ts
  { path: '/registers/keys/:keyIds/records_tree$', methods: ['GET'] }, // actions/registry.ts:116
  { path: '/registers/keys/:keyId/search$', methods: ['GET'] }, // actions/registry.ts:141
  { path: '/registers/rollback/start$', methods: ['POST'] }, // actions/registry.ts:152
  { path: '/registers/rollback/record$', methods: ['POST'] }, // actions/registry.ts:155
  { path: '/registers/rollback/:rollbackId/status$', methods: ['GET'] }, // actions/registry.ts:158
  // External reader.
  { path: '/external_reader$', methods: ['POST'] }, // actions/externalReader.ts:11, front-core Dialog.tsx:1195, ExternalRegister.tsx:312
  { path: '/external_reader/cache$', methods: ['DELETE'] }, // actions/task.ts:851
  { path: '/external_reader/captcha/providers/list$', methods: ['GET'] }, // actions/task.ts:906
  { path: '/external_reader/captcha/:service/:method$', methods: ['GET'] }, // actions/task.ts:898
  // Messages and inboxes.
  { path: '/messages$', methods: ['GET'] }, // actions/messages.ts:17, endPoints/message.ts
  { path: '/messages/count-unread$', methods: ['GET'] }, // actions/messages.ts:23
  { path: '/messages/state$', methods: ['PUT'] }, // actions/messages.ts
  { path: '/messages/:id/decrypt$', methods: ['PUT'] }, // actions/messages.ts:49
  { path: '/important-messages$', methods: ['GET'] }, // Datatable list. cabinet-front layouts/components/ImportantMessages.tsx:27
  { path: '/important-messages/:id/hide$', methods: ['PUT'] }, // layouts/components/ImportantMessages.tsx:68
  { path: '/user-inboxes$', methods: ['GET'] }, // endPoints/inboxFiles.ts
  { path: '/user-inboxes/unread/count$', methods: ['GET'] }, // actions/inbox.ts:12
  { path: '/user-inboxes/:id/is-read$', methods: ['PUT'] }, // actions/inbox.ts:19
  // Units and users.
  { path: '/units$', methods: ['GET'] }, // front-core actions/auth.ts:138
  { path: '/units/all$', methods: ['GET'] }, // front-core actions/auth.ts:144
  { path: '/units/:id/as-head$', methods: ['GET'] }, // cabinet-front actions/users.ts:16
  { path: '/units/:id/requested-members$', methods: ['POST'] }, // cabinet-front actions/users.ts:19
  { path: '/units/:id/members$', methods: ['DELETE'] }, // cabinet-front actions/users.ts:28
  { path: '/users$', methods: ['PUT'] }, // front-core actions/auth.ts:217
  { path: '/users/search$', methods: ['POST'] }, // cabinet-front actions/users.ts:37
  { path: '/users/two_factor_auth$', methods: ['GET', 'POST'] }, // front-core actions/auth.ts:247,259
  { path: '/users/phone/already_used$', methods: ['GET'] }, // front-core actions/auth.ts:251
  { path: '/users/phone/send_sms_for_phone_verification$', methods: ['POST'] }, // front-core actions/auth.ts
  { path: '/users/phone/verify$', methods: ['POST'] }, // front-core actions/auth.ts
  { path: '/users/email/change$', methods: ['PUT'] }, // front-core actions/auth.ts:279
  { path: '/users/email/check$', methods: ['POST'] }, // front-core actions/auth.ts
  { path: '/users/email/confirm$', methods: ['POST'] }, // front-core actions/auth.ts
  { path: '/users/email/check_email_confirmation_code$', methods: ['POST'] }, // front-core actions/auth.ts:299
  { path: '/user-settings$', methods: ['GET', 'POST'] }, // front-core actions/auth.ts:150, components/UserSettings/useUserSettings.ts:14
  { path: '/kyc/:provider$', methods: ['POST'] }, // front-core actions/stripe.ts
  { path: '/kyc/:provider/:id$', methods: ['GET', 'PUT'] }, // front-core actions/stripe.ts
  // Payment: the front uses POST /:customer/confirm_code and GET /receipt (cabinet-front actions/task.ts:98,140). Provider
  // callbacks (GET|POST /:customer/:status, POST /:customer) hit a public host and may come through here, so this stays a prefix.
  { path: '/payment', methods: ['GET', 'POST'] },
  { path: '/validate_apple_pay_session$', methods: ['POST'] }, // cabinet-front actions/task.ts:845
  { path: '/healthz$', methods: ['GET'] }, // Infrastructure monitoring (not the front)
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

function matchesEntry(method: string, path: string, entry: ProxyPathEntry): boolean {
  if (typeof entry === 'string') {
    return matchesPrefix(path, entry);
  }
  if (!matchesPrefix(path, entry.path) || (entry.except ?? []).some((pattern) => matchesPrefix(path, pattern))) {
    return false;
  }
  if (!entry.methods) {
    return true;
  }
  // Preflight carries no credentials and is answered by the CORS middleware before the proxy; keep it allowed on listed paths.
  return method === 'OPTIONS' || entry.methods.some((allowedMethod) => allowedMethod.toUpperCase() === method);
}

/**
 * Decide whether a request may be forwarded to the main proxy.
 * @param method HTTP method; HEAD is matched as GET. Only allow-list rules with `methods` look at it.
 * @param reqPath Request path.
 * @param cfg Discovery config.
 * @returns True if the request may be proxied.
 */
export function isMainProxyPathAllowed(method: string, reqPath: string, cfg: MainProxyFilterConfig = {}): boolean {
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
    const upperMethod = String(method ?? '').toUpperCase();
    const effectiveMethod = upperMethod === 'HEAD' ? 'GET' : upperMethod;
    return allowPaths.some((entry) => matchesEntry(effectiveMethod, path, entry));
  }
  return true;
}

import { CABINET_FRONT_PROXY_PATHS, isMainProxyPathAllowed, normalizeProxyPath } from './proxy_filter';

const allowed = (path: string, cfg = {}, method = 'GET') => isMainProxyPathAllowed(method, path, cfg);

describe('isMainProxyPathAllowed', () => {
  it.each([
    '/external_services/x',
    '/External-Services/x',
    '/external-services/workflow/soap',
    '/external_services',
    '//test/ping/services',
    '/test/ping/committed-documents/1',
    '/TEST/ping',
    '/test/ping/../auth/bearer',
    '/auth/bearer',
    '/auth/bearer/',
    '/AUTH//bearer',
    '/auth/bearer?x=1',
    '/external_reader/mocks-keys-by-user',
    '/external_services%2fx',
    '/external_services%2Fx',
    '/test%5cping',
    '/test/ping%00',
    '/test%00/ping',
    '/a/%2e%2e/test',
    '/a/%252e%252e/test',
    '/external%252fservices',
    '/test\\ping',
    '/%',
    '/test/./ping',
    '/%2574est/ping',
  ])('denies %s', (path) => {
    expect(allowed(path)).toBe(false);
  });

  it('denies encoded variants of a denied prefix', () => {
    expect(allowed('/%74est/ping/services')).toBe(false);
    expect(allowed('/external%5Fservices/x')).toBe(false);
  });

  it.each([
    '/tasks',
    '/payment/x/y',
    '/auth/me',
    '/authx/bearer',
    '/testing',
    '/external_reader',
    '/external_reader/async',
    '/external_reader/captcha/providers/list',
    '/external_reader/captcha/a/b',
    '/external_reader/cache',
    '/documents/1/external-reader/check',
    '/healthz',
  ])('allows %s by default', (path) => {
    expect(allowed(path)).toBe(true);
  });

  it('adds configured deny paths to the defaults', () => {
    const cfg = { mainProxyDenyPaths: ['/internal/:id/secret'] };
    expect(allowed('/internal/1/secret/x', cfg)).toBe(false);
    expect(allowed('/internal/1/other', cfg)).toBe(true);
    expect(allowed('/test', cfg)).toBe(false);
  });

  describe('allow-list mode', () => {
    const cfg = { mainProxyAllowPaths: ['/tasks', '/payment/:customer/:status', '/auth/me'] };

    it('allows only listed prefixes, case-insensitively', () => {
      expect(allowed('/tasks/1', cfg)).toBe(true);
      expect(allowed('/Tasks', cfg)).toBe(true);
      expect(allowed('/payment/a/b', cfg)).toBe(true);
      expect(allowed('/payment/a', cfg)).toBe(false);
      expect(allowed('/workflows', cfg)).toBe(false);
      expect(allowed('/tasksx', cfg)).toBe(false);
    });

    it('still applies the deny list and normalisation', () => {
      expect(allowed('/test/ping', { mainProxyAllowPaths: ['/test'] })).toBe(false);
      expect(allowed('/tasks/../workflows', cfg)).toBe(false);
    });

    it('treats an empty allow-list as disabled', () => {
      expect(allowed('/workflows', { mainProxyAllowPaths: [] })).toBe(true);
    });
  });

  describe('built-in cabinet front allow-list (mainProxyAllowPaths: "default")', () => {
    const cfg = { mainProxyAllowPaths: 'default' as const };

    // Concrete requests of the cabinet front (components/cabinet-front, packages/front-core), method and path.
    const frontRoutes: Array<[string, string]> = [
      ['POST', '/auth/login'],
      ['GET', '/auth/me?lang=en'],
      ['GET', '/redirect/auth'],
      ['GET', '/redirect/logout/?state=x'],
      ['GET', '/navigation-tree'],
      ['GET', '/ui-filters'],
      ['GET', '/custom-interfaces?route=/home'],
      ['GET', '/localization-languages'],
      ['GET', '/localization-texts?filters[key]=a'],
      ['GET', '/dictionaries/workflow-statuses'],
      ['GET', '/workflow-logs/1'],
      ['GET', '/workflows/1'],
      ['GET', '/workflow-templates'],
      ['GET', '/workflow-templates/1'],
      ['GET', '/workflow-template-categories'],
      ['GET', '/task-templates/1'],
      ['GET', '/document-templates'],
      ['GET', '/document-templates/1'],
      ['GET', '/tasks?page=1'],
      ['POST', '/tasks'],
      ['GET', '/tasks/1'],
      ['DELETE', '/tasks/1'],
      ['DELETE', '/tasks/1/permanent'],
      ['POST', '/tasks/1/recover'],
      ['GET', '/tasks/1/last'],
      ['GET', '/tasks/last/1/2'],
      ['GET', '/tasks/unread/count?filters[finished]=0'],
      ['POST', '/tasks/1/commit'],
      ['POST', '/tasks/1/assign'],
      ['PUT', '/tasks/1/signers'],
      ['PUT', '/tasks/1/due-date'],
      ['PUT', '/tasks/1/meta'],
      ['PUT', '/tasks/1/signers/requests?signer_request=a'],
      ['POST', '/tasks/1/signers/apply?signer_request=a'],
      ['GET', '/documents/1'],
      ['PUT', '/documents/1'],
      ['GET', '/documents/1/pdf'],
      ['POST', '/documents/1/pdf'],
      ['POST', '/documents/1/large-pdf'],
      ['GET', '/documents/1/asic'],
      ['POST', '/documents/1/attachments'],
      ['GET', '/documents/1/attachments/2?asics=false'],
      ['DELETE', '/documents/1/attachments/2'],
      ['GET', '/documents/1/sign'],
      ['POST', '/documents/1/sign?commit=true'],
      ['DELETE', '/documents/1/sign'],
      ['GET', '/documents/1/sign_p7s'],
      ['POST', '/documents/1/sign_p7s'],
      ['GET', '/documents/1/sign_additional_p7s'],
      ['POST', '/documents/1/sign_additional_p7s'],
      ['POST', '/documents/1/continue-sign'],
      ['POST', '/documents/1/singlesign/check'],
      ['POST', '/documents/1/multisign/check'],
      ['GET', '/documents/1/encrypt'],
      ['POST', '/documents/1/encrypt'],
      ['POST', '/documents/1/sign-rejection'],
      ['GET', '/documents/1/workflow_files?step=a'],
      ['GET', '/documents/1/workflow_files_direct?path=a'],
      ['POST', '/documents/1/calc'],
      ['POST', '/documents/1/calc_payment'],
      ['POST', '/documents/1/prepare'],
      ['POST', '/documents/1/validate?commit=true'],
      ['POST', '/documents/1/external-reader/check'],
      ['POST', '/documents/1/external-reader/check/async'],
      ['PUT', '/documents/1/verified-user-info'],
      ['POST', '/files?file_name=a'],
      ['GET', '/files/token?asics=true'],
      ['POST', '/protected-files'],
      ['GET', '/protected-files/keys/1/records/2?path=a'],
      ['GET', '/registers'],
      ['GET', '/registers/keys'],
      ['GET', '/registers/keys/1/records?limit=1'],
      ['POST', '/registers/keys/1/records'],
      ['POST', '/registers/keys/1/records/filter?limit=1'],
      ['GET', '/registers/keys/1/records/2'],
      ['PUT', '/registers/keys/1/records/2'],
      ['DELETE', '/registers/keys/1/records/2'],
      ['GET', '/registers/keys/1/records/2/history'],
      ['GET', '/registers/keys/1/history'],
      ['GET', '/registers/keys/1,2/records_tree'],
      ['GET', '/registers/keys/1/search?text=a'],
      ['POST', '/registers/rollback/start'],
      ['POST', '/registers/rollback/record'],
      ['GET', '/registers/rollback/1/status'],
      ['POST', '/external_reader'],
      ['DELETE', '/external_reader/cache'],
      ['GET', '/external_reader/captcha/providers/list'],
      ['GET', '/external_reader/captcha/svc/method'],
      ['GET', '/messages?page=1'],
      ['GET', '/messages/count-unread'],
      ['PUT', '/messages/state'],
      ['PUT', '/messages/1/decrypt'],
      ['GET', '/important-messages'],
      ['PUT', '/important-messages/1/hide'],
      ['GET', '/user-inboxes'],
      ['GET', '/user-inboxes/unread/count'],
      ['PUT', '/user-inboxes/1/is-read'],
      ['GET', '/units'],
      ['GET', '/units/all'],
      ['GET', '/units/1/as-head'],
      ['POST', '/units/1/requested-members'],
      ['DELETE', '/units/1/members'],
      ['PUT', '/users'],
      ['POST', '/users/search'],
      ['GET', '/users/two_factor_auth'],
      ['POST', '/users/two_factor_auth'],
      ['GET', '/users/phone/already_used?phone=1'],
      ['POST', '/users/phone/send_sms_for_phone_verification'],
      ['POST', '/users/phone/verify'],
      ['PUT', '/users/email/change'],
      ['POST', '/users/email/check'],
      ['POST', '/users/email/confirm'],
      ['POST', '/users/email/check_email_confirmation_code'],
      ['GET', '/user-settings'],
      ['POST', '/user-settings'],
      ['POST', '/kyc/stripe'],
      ['GET', '/kyc/stripe/1'],
      ['PUT', '/kyc/stripe/1'],
      ['POST', '/payment/ebabyEasyPaySms/confirm_code'],
      ['GET', '/payment/receipt?order_id=1'],
      ['GET', '/payment/liqpay/success'],
      ['POST', '/payment/liqpay/success'],
      ['POST', '/payment/liqpay'],
      ['POST', '/validate_apple_pay_session'],
      ['GET', '/healthz'],
    ];

    it.each(frontRoutes)('allows %s %s', (method, path) => {
      expect(isMainProxyPathAllowed(method, path, cfg)).toBe(true);
    });

    it('has no built-in entry that none of the audited front routes uses', () => {
      for (const entry of CABINET_FRONT_PROXY_PATHS) {
        expect(frontRoutes.some(([method, path]) => isMainProxyPathAllowed(method, path, { mainProxyAllowPaths: [entry] }))).toBe(true);
      }
    });

    it.each([
      '/external_services/workflow-logs/workflows',
      '/external-services/ping-rest',
      '/test/ping/services',
      '/auth/bearer',
      '/external_reader/mocks-keys-by-user',
      '/external_reader/async',
      '/tasks/statistics/get-by-unit-id',
      '/tasks/list/get-by-unit-id',
      '/tasks/expired-drafts',
      '/tasks/1/commit/x',
      '/documents/1/attachments/zip',
      '/files/a/b',
      '/registers/specifics/addresses',
      '/registers/keys/1/viewing_history',
      '/workflows',
      '/workflows/elastic-filtered/x',
      '/documents/1/pdf/x',
      '/unit-access',
      '/favorites/workflow/1',
      '/modules',
      '/monitor/system',
      '/register/cache',
      '/users/1/set-password',
      '/users/create_local',
      '/units/participants-as-head',
      '/units/1/anything',
      '/custom/bpmn-bi/reports',
      '/localization-languages/en',
      '/workflow-processes/1/files/a/p7s',
      '/something-new',
    ])('returns false for %s', (path) => {
      expect(allowed(path, cfg)).toBe(false);
    });

    // Methods sent by the front for a path, taken from the audited rows above.
    const methodsOf = (path: string) => frontRoutes.filter(([, p]) => normalizeProxyPath(p) === normalizeProxyPath(path)).map(([m]) => m);

    it('denies every audited path with a method the front does not use', () => {
      const wrong = frontRoutes.flatMap(([, path]) =>
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
          .filter((method) => !methodsOf(path).includes(method))
          .map((method): [string, string] => [method, path]),
      );
      // `/payment/*` is the provider callback prefix, open to GET and POST by design.
      const strict = wrong.filter(([, path]) => !path.startsWith('/payment/'));
      expect(strict.length).toBeGreaterThan(100);
      expect(strict.filter(([method, path]) => isMainProxyPathAllowed(method, path, cfg))).toEqual([]);
    });

    it.each([
      ['DELETE', '/documents/1/pdf'],
      ['POST', '/tasks/unread/count'],
      ['GET', '/tasks/1/commit'],
      ['DELETE', '/tasks/expired-drafts'],
      ['POST', '/tasks/statistics/get-by-unit-id'],
      ['POST', '/tasks/list/get-by-unit-id'],
      ['POST', '/tasks/by-other-system'],
      ['PUT', '/registers/keys/1/records/filter'],
      ['DELETE', '/registers/keys/1/records/filter'],
      ['DELETE', '/files/token'],
      ['GET', '/files'],
      ['PUT', '/registers/keys'],
      ['POST', '/registers'],
      ['PATCH', '/payment/liqpay/success'],
      ['DELETE', '/payment/liqpay/success'],
      ['POST', '/healthz'],
    ])('denies %s %s', (method, path) => {
      expect(isMainProxyPathAllowed(method, path, cfg)).toBe(false);
    });

    it('treats HEAD as GET', () => {
      expect(isMainProxyPathAllowed('HEAD', '/tasks/1', cfg)).toBe(true);
      expect(isMainProxyPathAllowed('head', '/files/token', cfg)).toBe(true);
      expect(isMainProxyPathAllowed('HEAD', '/tasks/1/commit', cfg)).toBe(false);
    });

    it('allows OPTIONS (CORS preflight) only on listed paths', () => {
      expect(isMainProxyPathAllowed('OPTIONS', '/tasks/1/commit', cfg)).toBe(true);
      expect(isMainProxyPathAllowed('OPTIONS', '/documents/1/pdf', cfg)).toBe(true);
      expect(isMainProxyPathAllowed('OPTIONS', '/tasks/statistics/get-by-unit-id', cfg)).toBe(false);
      expect(isMainProxyPathAllowed('OPTIONS', '/external_services/x', cfg)).toBe(false);
    });

    it('keeps the method list when a path is reached with a different case or trailing slash', () => {
      expect(isMainProxyPathAllowed('POST', '/Tasks/1/Commit/', cfg)).toBe(true);
      expect(isMainProxyPathAllowed('GET', '/Tasks/1/Commit/', cfg)).toBe(false);
    });

    it('lets plain string entries from config match any method', () => {
      const plain = { mainProxyAllowPaths: ['/tasks', '/files/:token$'] };
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
        expect(isMainProxyPathAllowed(method, '/tasks/1/commit', plain)).toBe(true);
        expect(isMainProxyPathAllowed(method, '/files/x', plain)).toBe(true);
      }
      expect(isMainProxyPathAllowed('GET', '/workflows', plain)).toBe(false);
    });

    it('accepts rule objects in operator config next to strings', () => {
      const mixed = { mainProxyAllowPaths: ['/a', { path: '/b/:id$', methods: ['post'], except: ['/b/x$'] }] };
      expect(isMainProxyPathAllowed('DELETE', '/a/1', mixed)).toBe(true);
      expect(isMainProxyPathAllowed('POST', '/b/1', mixed)).toBe(true);
      expect(isMainProxyPathAllowed('GET', '/b/1', mixed)).toBe(false);
      expect(isMainProxyPathAllowed('POST', '/b/x', mixed)).toBe(false);
    });

    it('is off unless configured', () => {
      expect(allowed('/something-new')).toBe(true);
      expect(allowed('/something-new', { mainProxyAllowPaths: [] })).toBe(true);
    });

    it('is overridden by an explicit array', () => {
      const explicit = { mainProxyAllowPaths: ['/something-new'] };
      expect(allowed('/something-new', explicit)).toBe(true);
      expect(allowed('/tasks/1', explicit)).toBe(false);
      expect(allowed('/auth/me', explicit)).toBe(false);
    });

    it('still applies mainProxyDenyPaths', () => {
      expect(allowed('/tasks/1', { ...cfg, mainProxyDenyPaths: ['/tasks/:id/commit'] })).toBe(true);
      expect(isMainProxyPathAllowed('POST', '/tasks/1/commit', { ...cfg, mainProxyDenyPaths: ['/tasks/:id/commit'] })).toBe(false);
    });

    it('treats "$" as an exact path match', () => {
      expect(allowed('/external_reader', cfg, 'POST')).toBe(true);
      expect(allowed('/external_reader/async', cfg, 'POST')).toBe(false);
      expect(allowed('/units/1', cfg)).toBe(false);
      expect(allowed('/units/1', { mainProxyAllowPaths: ['/units$'] })).toBe(false);
    });
  });
});

describe('normalizeProxyPath', () => {
  it('collapses slashes, lower-cases and strips the trailing slash and query', () => {
    expect(normalizeProxyPath('//Tasks//1/?a=b')).toBe('/tasks/1');
    expect(normalizeProxyPath('/')).toBe('/');
  });
});

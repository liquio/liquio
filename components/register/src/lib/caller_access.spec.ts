import { resolveCallerAccess, parseStrictBoolean } from './caller_access';

const cfg = (auth: any = {}) => ({ auth: { tokens: [], allowRawSequelizeParamsUsers: [], limitedAccess: [], ...auth } }) as any;
const req = (user?: string) => ({ auth: user ? { user } : undefined });
const flags = { allow_see_all_records: 'true', disable_fields_rules: true, allow_tokens: ['a%20b', 'c'] };

describe('resolveCallerAccess', () => {
  it('honours requested flags for a trusted caller', () => {
    const access = resolveCallerAccess(req('task'), cfg({ trustedCallers: ['task'] }), flags);
    expect(access).toMatchObject({ trusted: true, allowSeeAll: true, disableFieldsRules: true, allowTokens: ['a b', 'c'], ignoredFlags: [] });
  });

  it('parses string "false" strictly for a trusted caller', () => {
    const access = resolveCallerAccess(req('task'), cfg({ trustedCallers: ['task'] }), { allow_see_all_records: 'false', disable_fields_rules: '0' });
    expect(access).toMatchObject({ allowSeeAll: false, disableFieldsRules: false, allowTokens: [] });
    expect(parseStrictBoolean('false')).toBe(false);
    expect(parseStrictBoolean('TRUE')).toBe(true);
    expect(parseStrictBoolean(undefined)).toBe(false);
  });

  it('ignores flags for an untrusted caller and reports them', () => {
    const access = resolveCallerAccess(req('other'), cfg({ trustedCallers: ['task'] }), flags);
    expect(access).toMatchObject({ trusted: false, allowSeeAll: false, disableFieldsRules: false, allowTokens: [] });
    expect(access.ignoredFlags).toEqual(['allow_see_all_records', 'disable_fields_rules', 'allow_tokens']);
  });

  it('fails closed with empty or missing trustedCallers', () => {
    for (const trustedCallers of [undefined, []]) {
      const access = resolveCallerAccess(req('task'), cfg({ trustedCallers }), flags);
      expect(access).toMatchObject({ trusted: false, allowSeeAll: false, disableFieldsRules: false, allowTokens: [] });
    }
  });

  it('fails closed without an authenticated user', () => {
    const access = resolveCallerAccess(req(), cfg({ trustedCallers: ['task'] }), flags);
    expect(access.trusted).toBe(false);
  });

  it('uses server-side userAllowTokens for untrusted callers (own property only)', () => {
    const config = cfg({ userAllowTokens: { alice: ['t1', 't2'] } });
    expect(resolveCallerAccess(req('alice'), config, { allow_tokens: ['evil'] }).allowTokens).toEqual(['t1', 't2']);
    expect(resolveCallerAccess(req('bob'), config).allowTokens).toEqual([]);
    expect(resolveCallerAccess(req('constructor'), config).allowTokens).toEqual([]);
    expect(resolveCallerAccess(req('__proto__'), config).allowTokens).toEqual([]);
  });

  it('does not let the caller mutate the config tokens', () => {
    const config = cfg({ userAllowTokens: { alice: ['t1'] } });
    resolveCallerAccess(req('alice'), config).allowTokens.push('x');
    expect(config.auth.userAllowTokens.alice).toEqual(['t1']);
  });

  it('throws on malformed config', () => {
    expect(() => resolveCallerAccess(req('alice'), cfg({ userAllowTokens: { alice: 'x' } }))).toThrow();
    expect(() => resolveCallerAccess(req('alice'), cfg({ userAllowTokens: { alice: [1] } }))).toThrow();
    expect(() => resolveCallerAccess(req('alice'), cfg({ userAllowTokens: ['x'] }))).toThrow();
    expect(() => resolveCallerAccess(req('alice'), cfg({ trustedCallers: 'alice' }))).toThrow();
  });
});

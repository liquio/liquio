import { isLegacyGetConfirmationEnabled, legacyConfirmationQueryGuard } from './legacy_get_confirmation';

describe('legacy GET confirmation guard (SE-3930 IF-05)', () => {
  const log = { save: jest.fn() };
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };
  const req = (query: Record<string, string> = {}) => ({ method: 'GET', path: '/x', query }) as any;

  beforeEach(() => jest.clearAllMocks());

  it('is enabled unless the flag is explicitly false', () => {
    expect(isLegacyGetConfirmationEnabled({})).toBe(true);
    expect(isLegacyGetConfirmationEnabled(undefined)).toBe(true);
    expect(isLegacyGetConfirmationEnabled({ legacyGetConfirmation: true })).toBe(true);
    expect(isLegacyGetConfirmationEnabled({ legacyGetConfirmation: false })).toBe(false);
    expect(isLegacyGetConfirmationEnabled({ legacyGetConfirmation: 'false' })).toBe(false);
  });

  it('passes through with a deprecation log that has no query values', () => {
    const next = jest.fn();
    legacyConfirmationQueryGuard(log, {})(req({ code: '123456', email: 'a@b.c' }), makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(log.save).toHaveBeenCalledWith('legacy-confirmation-query-deprecated', { method: 'GET', path: '/x', enabled: true }, 'warning');
    expect(JSON.stringify(log.save.mock.calls)).not.toContain('123456');
  });

  it('answers 410 when disabled', () => {
    const next = jest.fn();
    const res = makeRes();
    legacyConfirmationQueryGuard(log, { legacyGetConfirmation: false })(req(), res, next);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(next).not.toHaveBeenCalled();
  });

  it('with sensitive fields, ignores requests that carry none of them in the query', () => {
    const next = jest.fn();
    const res = makeRes();
    legacyConfirmationQueryGuard(log, { legacyGetConfirmation: false }, ['phone', 'code'])(req(), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(log.save).not.toHaveBeenCalled();
  });
});

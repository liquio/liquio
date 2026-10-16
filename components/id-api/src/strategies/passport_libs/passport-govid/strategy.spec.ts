const mockSave = jest.fn();
jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: mockSave }) } }));
jest.mock('axios');

import axios from 'axios';

import { GovIdStrategy } from './strategy';

const validSession = (createdAt = Date.now()): any => ({ govid: { state: 'own-test-state', createdAt } });

describe('GovID profile credentials', () => {
  it('passes identity metadata to verification without persisting upstream tokens', async () => {
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({ data: { access_token: 'own-test-upstream-token', user_id: 'own-test-id' } })
      .mockResolvedValueOnce({
        data: {
          lastname: 'Test',
          givenname: 'User',
          drfocode: '1234567890',
          access_token: 'provider-response-token',
          nested: { refreshToken: 'refresh', label: 'public' },
        },
      });
    const verify = jest.fn((_req, profile, done) => done(null, profile));
    const strategy = new GovIdStrategy({ authorizationUrl: 'https://govid.example', clientId: 'test', clientSecret: 'test' } as any, verify);
    const success = jest.fn();
    strategy.success = success;
    await strategy.authenticateAsync({
      body: { code: 'own-test-code', state: 'own-test-state' },
      session: validSession(),
      header: () => undefined,
      socket: {},
    } as any);
    const profile = verify.mock.calls[0][1];
    expect(profile.surname).toBe('Test');
    expect(profile.raw.drfocode).toBe('1234567890');
    expect(profile.raw.nested).toEqual({ label: 'public' });
    expect(JSON.stringify(profile)).not.toContain('token');
    expect(success).toHaveBeenCalledWith(profile, null);
  });

  it('never writes upstream tokens, client secret or raw profile data to logs', async () => {
    mockSave.mockClear();
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({ data: { access_token: 'own-test-upstream-token', user_id: 'own-test-id' } })
      .mockResolvedValueOnce({ data: { lastname: 'Test', givenname: 'User', drfocode: '1234567890' } });
    const verify = jest.fn((_req, profile, done) => done(null, profile));
    const strategy = new GovIdStrategy(
      { authorizationUrl: 'https://govid.example', clientId: 'test', clientSecret: 'own-test-client-secret' } as any,
      verify,
    );
    strategy.success = jest.fn();
    await strategy.authenticateAsync({
      body: { code: 'own-test-code', state: 'own-test-state' },
      session: validSession(),
      header: () => undefined,
      socket: {},
    } as any);

    const logged = JSON.stringify(mockSave.mock.calls);
    expect(logged).toContain('authenticate-govid|govid-tokens');
    expect(logged).toContain('own-test-id');
    expect(logged).not.toContain('own-test-upstream-token');
    expect(logged).not.toContain('own-test-client-secret');
    expect(logged).not.toContain('1234567890');
  });

  it('does not log token-bearing URLs or response data when the upstream request fails', async () => {
    mockSave.mockClear();
    const upstreamError: any = new Error('boom own-test-upstream-token');
    upstreamError.response = { status: 502, data: { message: 'own-test-secret-body' } };
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({ data: { access_token: 'own-test-upstream-token', user_id: 'own-test-id' } })
      .mockRejectedValueOnce(upstreamError);
    const strategy = new GovIdStrategy(
      { authorizationUrl: 'https://govid.example', clientId: 'test', clientSecret: 'own-test-client-secret' } as any,
      jest.fn(),
    );
    strategy.error = jest.fn();
    await strategy.authenticateAsync({
      body: { code: 'own-test-code', state: 'own-test-state' },
      session: validSession(),
      header: () => undefined,
      socket: {},
    } as any);

    const logged = JSON.stringify(mockSave.mock.calls);
    expect(logged).toContain('govid-request-error');
    expect(logged).not.toContain('own-test-upstream-token');
    expect(logged).not.toContain('own-test-secret-body');
    expect(logged).not.toContain('own-test-client-secret');
  });

  describe('state binding (login CSRF)', () => {
    const run = async (body: any, session: any) => {
      (axios.get as jest.Mock).mockClear();
      const send = jest.fn();
      const res: any = { status: jest.fn(() => ({ send })), redirect: jest.fn() };
      const verify = jest.fn((_req, profile, done) => done(null, profile));
      const strategy = new GovIdStrategy({ authorizationUrl: 'https://govid.example', clientId: 'test', clientSecret: 'test' } as any, verify);
      strategy.success = jest.fn();
      const req: any = { body, session, res, header: () => undefined, socket: {} };
      await strategy.authenticateAsync(req);
      return { res, send, verify, req };
    };

    it.each([
      ['missing', { code: 'c' }, validSession()],
      ['wrong', { code: 'c', state: 'other-state' }, validSession()],
      ['expired', { code: 'c', state: 'own-test-state' }, validSession(Date.now() - 11 * 60 * 1000)],
      ['absent in session', { code: 'c', state: 'own-test-state' }, {}],
    ])('rejects %s state without exchanging the code', async (_name, body, session) => {
      const { res, verify } = await run(body, session);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(axios.get).not.toHaveBeenCalled();
      expect(verify).not.toHaveBeenCalled();
    });

    it('rejects a replayed state (single use)', async () => {
      const session = validSession();
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { access_token: 't', user_id: 'u' } })
        .mockResolvedValueOnce({ data: { lastname: 'Test', givenname: 'User', drfocode: '1234567890' } });
      const first = await run({ code: 'c', state: 'own-test-state' }, session);
      expect(first.res.status).not.toHaveBeenCalled();
      expect(session.govid).toBeUndefined();
      const second = await run({ code: 'c', state: 'own-test-state' }, session);
      expect(second.res.status).toHaveBeenCalledWith(400);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('issues a random server-side state on redirect and ignores the client-supplied one', async () => {
      const session: any = {};
      const res: any = { redirect: jest.fn() };
      const strategy = new GovIdStrategy(
        { authorizationUrl: 'https://govid.example', clientId: 'test', redirectUrl: 'https://r.example' } as any,
        jest.fn(),
      );
      await strategy.authenticateAsync({ body: {}, query: { state: 'attacker' }, session, res, header: () => undefined, socket: {} } as any);
      const state = new URL(res.redirect.mock.calls[0][0]).searchParams.get('state');
      expect(state).toBe(session.govid.state);
      expect(state).not.toBe('attacker');
      expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });
  });
});

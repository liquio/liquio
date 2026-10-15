const mockSave = jest.fn();
jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: mockSave }) } }));
jest.mock('axios');

import axios from 'axios';

import { GovIdStrategy } from './strategy';

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
    await strategy.authenticateAsync({ body: { code: 'own-test-code' }, header: () => undefined, socket: {} } as any);
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
    await strategy.authenticateAsync({ body: { code: 'own-test-code' }, header: () => undefined, socket: {} } as any);

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
    await strategy.authenticateAsync({ body: { code: 'own-test-code' }, header: () => undefined, socket: {} } as any);

    const logged = JSON.stringify(mockSave.mock.calls);
    expect(logged).toContain('govid-request-error');
    expect(logged).not.toContain('own-test-upstream-token');
    expect(logged).not.toContain('own-test-secret-body');
    expect(logged).not.toContain('own-test-client-secret');
  });
});

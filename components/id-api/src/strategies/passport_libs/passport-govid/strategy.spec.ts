jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: jest.fn() }) } }));
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
});

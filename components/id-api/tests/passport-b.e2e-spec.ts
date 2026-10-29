import axios from 'axios';
import passport from 'passport';

import { TestApp, config } from './test_app';
import { fetchOAuth2Profile } from '../src/middleware/passport';

describe('Passport middleware coverage (group B)', () => {
  let app: TestApp;
  const verify = (profile: any = { id: 'p1' }) =>
    new Promise<{ err: any; user: any }>((resolve) => {
      (passport as any)._strategy('oauth2')._verify('access', 'refresh', profile, (err: any, user: any) => resolve({ err, user }));
    });

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true } as any;
    config.auth_providers.oauth2 = {
      authorizationURL: 'http://idp.example/authorize',
      tokenURL: 'http://idp.example/token',
      clientID: 'cid',
      clientSecret: 'csecret',
      callbackURL: 'http://localhost/authorise/oauth2/callback',
      userProfileUrl: 'http://idp.example/profile',
    } as any;
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchOAuth2Profile', () => {
    it('sends the token as a Bearer header by default', async () => {
      const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: {} } as any);
      await fetchOAuth2Profile({ userProfileUrl: 'http://idp.example/profile' }, 'tok');
      expect(get).toHaveBeenCalledWith('http://idp.example/profile', { headers: { Authorization: 'Bearer tok' } });
    });

    it('sends the token in the query with tokenInQuery and warns', async () => {
      const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: {} } as any);
      const log = { save: jest.fn() };
      await fetchOAuth2Profile({ userProfileUrl: 'http://idp.example/profile', tokenInQuery: true }, 'tok', log as any);
      expect(get).toHaveBeenCalledWith('http://idp.example/profile', { params: { access_token: 'tok' } });
      expect(log.save).toHaveBeenCalledWith('user-auth-by-oauth2-token-in-query', expect.anything(), 'warn');
    });
  });

  describe('serialization', () => {
    const serialize = (user: any) =>
      new Promise<{ err: any; out: any }>((resolve) => (passport as any).serializeUser(user, (err: any, out: any) => resolve({ err, out })));
    const deserialize = (user: any) =>
      new Promise<{ err: any; out: any }>((resolve) => (passport as any).deserializeUser(user, (err: any, out: any) => resolve({ err, out })));

    it('serializes and rejects undefined users', async () => {
      expect((await serialize({ userId: 'x' })).out).toEqual({ userId: 'x' });
      expect((await serialize(undefined)).err).toBeTruthy();
      expect((await serialize({ cached: true, user_id: 'missing-cache-key' })).err).toBeTruthy();
    });

    it('deserializes cached, undefined, unknown and known users', async () => {
      expect((await deserialize(undefined)).err).toBeTruthy();
      const cached = await deserialize({ cached: true, user_id: 'cache-b-1' });
      expect(cached.err).toBeNull();
      expect((await deserialize({ cached: true, user_id: 'cache-b-1' })).out).toBeTruthy();
      expect((await deserialize({ userId: '00000000-0000-4000-8000-000000000000' })).err).toBeTruthy();
      const user = await app
        .model('user')
        .create({ ipn: '#7700099', provider: 'local', email: 'passport-b@example.com' }, { returning: true })
        .then((row) => row.dataValues);
      expect((await deserialize({ userId: user.userId })).out.email).toBe('passport-b@example.com');
    });
  });

  describe('oauth2 strategy', () => {
    it('redirects to the identity provider', async () => {
      const res = await app.request().get('/authorise/oauth2').redirects(0).expect(302);
      expect(res.headers.location).toContain('http://idp.example/authorize');
    });

    it('creates a user from the upstream profile, then finds it again', async () => {
      jest
        .spyOn(axios, 'get')
        .mockResolvedValue({ data: { ipn: '#7700100', first_name: 'Oa', last_name: 'Two', email: 'oauth2-b@example.com', role: 'user' } } as any);
      const first = await verify();
      expect(first.err).toBeNull();
      expect(first.user.email).toBe('oauth2-b@example.com');
      const second = await verify();
      expect(second.user.userId).toBe(first.user.userId);
    });

    it('reports create failures and profile fetch failures', async () => {
      jest.spyOn(axios, 'get').mockResolvedValue({ data: { ipn: '#7700101', email: 'oauth2-c@example.com' } } as any);
      jest.spyOn(app.model('user'), 'create').mockRejectedValueOnce(new Error('create failed'));
      expect((await verify()).err?.message).toBe('create failed');
      jest.spyOn(axios, 'get').mockRejectedValue(new Error('idp down'));
      expect((await verify()).err?.message).toBe('idp down');
    });
  });
});

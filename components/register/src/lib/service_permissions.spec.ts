import { authorizeRequest, checkServicePermissionsConfig, listUnrestrictedUsers } from './service_permissions';

const req = (method: string, path: string, extra: any = {}) => ({ method, url: path, route: { path }, query: {}, body: {}, params: {}, ...extra });
const auth = (extra: any = {}): any => ({ tokens: [], ...extra });

describe('service_permissions', () => {
  describe('authorizeRequest', () => {
    it('keeps full access for a user without an entry (default)', () => {
      expect(authorizeRequest(auth(), 'anyone', req('DELETE', '/keys/:id')).allowed).toBe(true);
      expect(authorizeRequest(auth({ servicePermissions: { other: { routes: [] } } }), 'anyone', req('POST', '/rollback/start')).allowed).toBe(true);
    });

    it('allows only listed routes for a user with an entry', () => {
      const a = auth({ servicePermissions: { task: { routes: ['GET /records', 'POST /records'] } } });
      expect(authorizeRequest(a, 'task', req('GET', '/records')).allowed).toBe(true);
      const denied = authorizeRequest(a, 'task', req('DELETE', '/records/:id'));
      expect(denied).toMatchObject({ allowed: false, reason: 'route-not-allowed' });
    });

    it('denies everything for an entry without routes, and allows all with "*"', () => {
      expect(authorizeRequest(auth({ servicePermissions: { u: {} } }), 'u', req('GET', '/records')).allowed).toBe(false);
      expect(authorizeRequest(auth({ servicePermissions: { u: { routes: ['*'] } } }), 'u', req('POST', '/rollback/start')).allowed).toBe(true);
    });

    it('scopes keys (query, body, /keys/:id) and denies when the key is unknown', () => {
      const a = auth({ servicePermissions: { u: { routes: ['*'], keys: [5, '6'] } } });
      expect(authorizeRequest(a, 'u', req('GET', '/records', { query: { key_id: '5' } })).allowed).toBe(true);
      expect(authorizeRequest(a, 'u', req('GET', '/records', { query: { key_id: '7' } })).reason).toBe('key-not-allowed');
      expect(authorizeRequest(a, 'u', req('POST', '/records', { body: { key_id: 6 } })).allowed).toBe(true);
      expect(authorizeRequest(a, 'u', req('POST', '/rollback/record', { body: { keyId: 7 } })).allowed).toBe(false);
      expect(authorizeRequest(a, 'u', req('GET', '/keys/:id', { params: { id: '5' } })).allowed).toBe(true);
      expect(authorizeRequest(a, 'u', req('GET', '/records/:id', { params: { id: 'uuid' } })).reason).toBe('key-not-allowed');
    });

    it('falls back to the URL without query when no express route is set', () => {
      const a = auth({ servicePermissions: { u: { routes: ['GET /records'] } } });
      expect(authorizeRequest(a, 'u', { method: 'get', url: '/records?key_id=1' }).allowed).toBe(true);
    });

    it('does not grant anything through prototype names', () => {
      expect(authorizeRequest(auth({ servicePermissions: {} }), 'constructor', req('GET', '/records')).allowed).toBe(true);
    });

    describe('strict mode', () => {
      it('is off by default', () => {
        expect(authorizeRequest(auth(), 'u', req('POST', '/rollback/start')).allowed).toBe(true);
      });

      it('denies destructive routes to non-trusted users, even without an entry', () => {
        const a = auth({ strict: true, trustedCallers: ['admin'] });
        for (const [m, p] of [
          ['POST', '/rollback/start'],
          ['POST', '/rollback/record'],
          ['DELETE', '/keys/:id'],
          ['DELETE', '/registers/:id'],
          ['DELETE', '/records/:id'],
          ['DELETE', '/records/bulk'],
        ]) {
          expect(authorizeRequest(a, 'u', req(m, p))).toMatchObject({ allowed: false, reason: 'destructive-route-requires-trusted-caller' });
          expect(authorizeRequest(a, 'admin', req(m, p)).allowed).toBe(true);
        }
        expect(authorizeRequest(a, 'u', req('GET', '/records')).allowed).toBe(true);
        expect(authorizeRequest(a, 'u', req('PATCH', '/records/:id')).allowed).toBe(true);
      });

      it('still applies the allow-list to trusted users with an entry', () => {
        const a = auth({ strict: true, trustedCallers: ['admin'], servicePermissions: { admin: { routes: ['GET /records'] } } });
        expect(authorizeRequest(a, 'admin', req('DELETE', '/keys/:id')).reason).toBe('route-not-allowed');
      });
    });
  });

  describe('checkServicePermissionsConfig', () => {
    it('accepts missing and valid config', () => {
      expect(checkServicePermissionsConfig(auth())).toEqual([]);
      expect(checkServicePermissionsConfig(auth({ strict: false, servicePermissions: { a: { routes: ['GET /records'], keys: [1] } } }))).toEqual([]);
    });

    it('reports malformed config', () => {
      expect(checkServicePermissionsConfig(auth({ servicePermissions: [] }))).toHaveLength(1);
      expect(checkServicePermissionsConfig(auth({ servicePermissions: { a: 'x' } }))).toHaveLength(1);
      expect(checkServicePermissionsConfig(auth({ servicePermissions: { a: { routes: 'GET /records', keys: [{}] } } }))).toHaveLength(2);
      expect(checkServicePermissionsConfig(auth({ strict: 'yes' }))).toHaveLength(1);
    });
  });

  describe('listUnrestrictedUsers', () => {
    it('lists users with neither an entry nor limitedAccess', () => {
      const t = (u: string) => `Basic ${Buffer.from(`${u}:secret-password`).toString('base64')}`;
      const a = auth({
        tokens: [t('task'), t('event'), t('reader'), 'garbage'],
        servicePermissions: { task: { routes: ['*'] } },
        limitedAccess: [{ user: 'reader', keys: ['1'] }],
      });
      expect(listUnrestrictedUsers(a)).toEqual(['event']);
    });
  });
});

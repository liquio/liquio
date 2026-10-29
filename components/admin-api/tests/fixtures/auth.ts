import type { TestApp } from '../test-app';

// Fake admin user that is a member of every admin unit (see grantAllAdminUnits).
export const SUPER_ADMIN_ID = 'aaaaaaaaaaaaaaaaaaaaaa01';

export const ADMIN_UNIT_IDS = [
  1000000, 1000001, 1000002, 1000003, 1000012, 1000013, 1000015, 1000016, 1000017, 100002, 100003, 1000000041, 1000000042, 1000000043,
];

/**
 * Add the super admin to the members and heads of all admin units, creating the units that are missing.
 */
export async function grantAllAdminUnits(app: TestApp, userId: string = SUPER_ADMIN_ID) {
  const unitModel = app.model('unit');
  for (const id of ADMIN_UNIT_IDS) {
    const existing = await unitModel.findByPk(id);
    if (existing) {
      const members = Array.from(new Set([...(existing.members || []), userId]));
      const heads = Array.from(new Set([...(existing.heads || []), userId]));
      await unitModel.update({ members, heads }, { where: { id } });
    } else {
      await unitModel.create({
        id,
        parent_id: null,
        based_on: [],
        name: `Admin unit ${id}`,
        description: `Admin unit ${id}`,
        members: [userId],
        heads: [userId],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
        requested_members: [],
      });
    }
  }
}

/**
 * Prepare an authenticated supertest request: signs a JWT and mocks the id-api `user/info` call once.
 */
export function asAdmin(app: TestApp, method: 'get' | 'post' | 'put' | 'delete', path: string, userId: string = SUPER_ADMIN_ID) {
  const { jwt, payload } = app.generateUserToken(userId);
  app
    .nock('http://id-api:8100')
    .get('/user/info')
    .query({ access_token: payload.authTokens.accessToken })
    .once()
    .reply(200, { userId, role: 'admin', name: 'Test Admin', services: { eds: { data: { pem: 'PEM' } } } });
  return app.request()[method](path).set('token', jwt);
}

/**
 * Parser that keeps a response body as a string (for file downloads).
 */
export function textParser(res, callback) {
  let data = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => callback(null, data));
}

/**
 * Mock the id-api user lookup used when saving units, once or more.
 */
export function nockIdUsers(app: TestApp, users: Record<string, any>[]) {
  return app.nock('http://id-api:8100').persist().post('/user/info/id').optionally().reply(200, users);
}

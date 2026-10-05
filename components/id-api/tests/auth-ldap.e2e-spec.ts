import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import { TestApp, config } from './test_app';
import { Services } from '../src/services';
import { getTaskTokenCacheKey } from '../src/services/auth.service';

const BASE_DN = 'dc=example,dc=org';
const ADMIN_DN = `cn=admin,${BASE_DN}`;
const ADMIN_PASSWORD = 'adminpw';
const CONFIG_DN = 'cn=config,cn=config';
const CONFIG_PASSWORD = 'configpw';
const ACCESS_GROUP = `cn=liquio,ou=groups,${BASE_DN}`;
const UNIT_GROUP = `cn=liquio-unit,ou=groups,${BASE_DN}`;
// groupOfNames requires a member, so a group keeps one after Alice is removed from it.
const PLACEHOLDER_MEMBER = `cn=placeholder,${BASE_DN}`;
const ALICE_DN = `uid=alice,ou=users,${BASE_DN}`;

// Load the memberOf overlay (the image does not enable it).
const OVERLAY_LDIF = `dn: cn=module{0},cn=config
changetype: modify
add: olcModuleLoad
olcModuleLoad: /opt/bitnami/openldap/lib/openldap/memberof.so

dn: olcOverlay=memberof,olcDatabase={2}mdb,cn=config
changetype: add
objectClass: olcOverlayConfig
objectClass: olcMemberOf
olcOverlay: memberof
olcMemberOfRefint: TRUE
`;

// Groups are created after the overlay is loaded, so that memberOf is maintained.
const DIRECTORY_LDIF = `dn: uid=alice,ou=users,${BASE_DN}
changetype: add
objectClass: inetOrgPerson
uid: alice
cn: Alice Smith
sn: Smith
givenName: Alice
mail: Alice@Example.org
userPassword: alicepw

dn: uid=bob,ou=users,${BASE_DN}
changetype: add
objectClass: inetOrgPerson
uid: bob
cn: Bob Jones
sn: Jones
givenName: Bob
mail: bob@example.org
userPassword: bobpw

dn: ${ACCESS_GROUP}
changetype: add
objectClass: groupOfNames
cn: liquio
member: uid=alice,ou=users,${BASE_DN}
member: ${PLACEHOLDER_MEMBER}
`;

describe('AuthController - ldap', () => {
  let app: TestApp;
  let ldapContainer: StartedTestContainer;

  // Retries only while the server is not reachable yet; a rejected change fails at once.
  async function ldapModify(dn: string, password: string, ldif: string, file: string) {
    for (let attempt = 1; ; attempt++) {
      try {
        await ldapContainer.copyContentToContainer([{ content: ldif, target: file }]);
        const result = await ldapContainer.exec(['ldapmodify', '-x', '-H', 'ldap://localhost:1389', '-D', dn, '-w', password, '-f', file]);
        if (result.exitCode === 0) {
          return;
        }
        if (!result.output.includes("Can't contact") || attempt >= 10) {
          throw new Error(`ldapmodify failed: ${result.output}`);
        }
      } catch (error: any) {
        if (error.message?.startsWith('ldapmodify failed') || attempt >= 10) {
          throw error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  beforeAll(async () => {
    await TestApp.beforeAll();

    ldapContainer = await new GenericContainer('bitnamilegacy/openldap:2.6.10')
      .withExposedPorts(1389)
      .withEnvironment({
        LDAP_ROOT: BASE_DN,
        LDAP_ADMIN_USERNAME: 'admin',
        LDAP_ADMIN_PASSWORD: ADMIN_PASSWORD,
        LDAP_CONFIG_ADMIN_ENABLED: 'yes',
        LDAP_CONFIG_ADMIN_USERNAME: 'config',
        LDAP_CONFIG_ADMIN_PASSWORD: CONFIG_PASSWORD,
      })
      .withWaitStrategy(Wait.forLogMessage(/Starting slapd/))
      .withStartupTimeout(120000)
      .start();

    await ldapModify(CONFIG_DN, CONFIG_PASSWORD, OVERLAY_LDIF, '/tmp/overlay.ldif');
    await ldapModify(ADMIN_DN, ADMIN_PASSWORD, DIRECTORY_LDIF, '/tmp/directory.ldif');
  }, 180000);

  afterAll(async () => {
    await app?.destroy();
    await ldapContainer?.stop();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  it('should setup an app successfully', async () => {
    config.redis.isEnabled = true;
    config.auth_providers.ldap = {
      isEnabled: true,
      connection: {
        url: `ldap://${ldapContainer.getHost()}:${ldapContainer.getMappedPort(1389)}`,
        bindDN: ADMIN_DN,
        bindPassword: ADMIN_PASSWORD,
        timeout: 5000,
        connectTimeout: 5000,
      },
      baseDN: BASE_DN,
      userFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
      idAttribute: 'entryUUID',
      nestedGroups: false,
      attributes: { email: 'mail', first_name: 'givenName', last_name: 'sn' },
      linkByEmail: false,
      accessGroups: [ACCESS_GROUP],
      sync: { isEnabled: true, intervalMinutes: 15 },
    };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };

    try {
      app = await TestApp.setup();
    } catch (error: any) {
      throw new Error(`Failed to setup app: ${error.toString()}`);
    }

    expect(TestApp.logs.find((log) => log.type === 'ldap-strategy')?.data).toEqual({ status: 'initialized' });
  });

  describe('Directory Authorization (ldap)', () => {
    let cookies: any;
    let userId: string;

    it('should expose ldap in the list of login options', async () => {
      await app
        .request()
        .get('/auth_providers')
        .expect(200)
        .expect(({ body }) => {
          expect(body.providers).toEqual([{ type: 'ldap', id: 'ldap', url: null }]);
        });
    });

    it('should reject a wrong password', async () => {
      await app
        .request()
        .post('/authorise/ldap')
        .send({ username: 'alice', password: 'wrong' })
        .expect(401)
        .expect(({ body }) => {
          expect(body).toEqual({ message: 'Invalid login or password.' });
        });
    });

    it('should reject an unknown user with the same error', async () => {
      await app
        .request()
        .post('/authorise/ldap')
        .send({ username: 'nobody', password: 'whatever' })
        .expect(401)
        .expect(({ body }) => {
          expect(body).toEqual({ message: 'Invalid login or password.' });
        });
    });

    it('should reject a user outside of the access group', async () => {
      await app
        .request()
        .post('/authorise/ldap')
        .send({ username: 'bob', password: 'bobpw' })
        .expect(401)
        .expect(({ body }) => {
          expect(body).toEqual({ message: 'Invalid login or password.' });
        });

      const user = await app.model('user').findOne({ where: { email: 'bob@example.org' } });
      expect(user).toBeNull();
    });

    it('should login a user from the access group', async () => {
      await app
        .request()
        .post('/authorise/ldap')
        .send({ username: 'alice', password: 'alicepw' })
        .expect(200)
        .expect(({ body, headers }) => {
          expect(body).toEqual({ error: null, redirect: '/authorise/continue/' });
          expect(headers['set-cookie']).toBeDefined();
          cookies = headers['set-cookie'];
        });

      const user = await app
        .model('user')
        .findOne({ where: { email: 'alice@example.org' } })
        .then((row) => row?.dataValues);
      expect(user).toMatchObject({
        email: 'alice@example.org',
        first_name: 'Alice',
        last_name: 'Smith',
        needOnboarding: false,
        userIdentificationType: 'ldap',
        ipn: expect.stringMatching(/^#[0-9a-f]{64}$/),
      });
      userId = user!.userId;

      const service = await app
        .model('userServices')
        .findOne({ where: { userId, provider: 'ldap' } })
        .then((row) => row?.dataValues);
      expect(service?.provider_id).toEqual(expect.any(String));
      expect(service?.data).toMatchObject({
        dn: `uid=alice,ou=users,${BASE_DN}`,
        groups: [ACCESS_GROUP],
        accessGroups: [ACCESS_GROUP],
        syncedAt: expect.any(String),
      });
      expect(JSON.stringify(service?.data)).not.toContain('alicepw');
    });

    it('should record the login and redirect to /authorise/continue', async () => {
      await app.request().get('/authorise/continue').set('Cookie', cookies).expect(302);

      const loginHistory = await app
        .model('loginHistory')
        .findOne({ where: { user_id: userId } })
        .then((row) => row?.dataValues);
      expect(loginHistory).toMatchObject({ action_type: 'login', user_id: userId });
    });

    it('should log in again with the same user without creating a duplicate', async () => {
      await app.request().post('/authorise/ldap').send({ username: 'ALICE', password: 'alicepw' }).expect(200);

      const count = await app.model('user').count({ where: { email: 'alice@example.org' } });
      expect(count).toBe(1);
    });

    it('should pass /auth for the logged in ldap user', async () => {
      await app
        .request()
        .get('/auth')
        .set('Cookie', cookies)
        .expect(200)
        .expect(({ body }) => {
          expect(body.provider).toBe('ldap');
          expect(body.info).toMatchObject({ userId, provider: 'ldap' });
        });
    });

    it('should reject ldap users on /auth when ldap is not an allowed identification type', async () => {
      config.allowIdentificationTypes = ['email'];
      try {
        await app.request().get('/auth').set('Cookie', cookies).expect(403);
      } finally {
        delete config.allowIdentificationTypes;
      }
    });
  });

  describe('Group existence (service endpoint)', () => {
    const basicHeader = () => ({ Authorization: `Basic ${config.oauth?.secret_key?.[0] || ''}` });

    it('should require basic auth', async () => {
      await app
        .request()
        .post('/ldap/groups/exists')
        .send({ dns: [ACCESS_GROUP] })
        .expect(401);
    });

    it('should return an existing group', async () => {
      await app
        .request()
        .post('/ldap/groups/exists')
        .set(basicHeader())
        .send({ dns: [ACCESS_GROUP] })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ existing: [ACCESS_GROUP] });
        });
    });

    it('should omit a missing group', async () => {
      const missing = `cn=gone,ou=groups,${BASE_DN}`;

      await app
        .request()
        .post('/ldap/groups/exists')
        .set(basicHeader())
        .send({ dns: [missing, ACCESS_GROUP] })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ existing: [ACCESS_GROUP] });
        });
    });

    it('should reject an invalid body', async () => {
      await app.request().post('/ldap/groups/exists').set(basicHeader()).send({ dns: 'not-an-array' }).expect(400);
      await app
        .request()
        .post('/ldap/groups/exists')
        .set(basicHeader())
        .send({ dns: [''] })
        .expect(400);
    });

    it('should reject more than 100 DNs', async () => {
      const dns = Array.from({ length: 101 }, (_, i) => `cn=g${i},ou=groups,${BASE_DN}`);

      await app.request().post('/ldap/groups/exists').set(basicHeader()).send({ dns }).expect(400);
    });
  });

  describe('Access revocation (sync)', () => {
    const CLIENT_ID = 'ldap-sync-client';
    const CLIENT_SECRET = 'ldap-sync-secret';
    const basicHeader = () => ({ Authorization: `Basic ${config.oauth?.secret_key?.[0] || ''}` });
    let userId: string;
    let codeCounter = 0;

    const removeFrom = (group: string) =>
      ldapModify(ADMIN_DN, ADMIN_PASSWORD, `dn: ${group}\nchangetype: modify\ndelete: member\nmember: ${ALICE_DN}\n`, '/tmp/remove.ldif');
    const addTo = (group: string) =>
      ldapModify(ADMIN_DN, ADMIN_PASSWORD, `dn: ${group}\nchangetype: modify\nadd: member\nmember: ${ALICE_DN}\n`, '/tmp/add.ldif');

    const login = () => app.request().post('/authorise/ldap').send({ username: 'alice', password: 'alicepw' });

    // Issue real tokens: an authorization code is put in the database, then exchanged on the token endpoint.
    async function issueTokens(): Promise<{ accessToken: string; refreshToken: string }> {
      const code = `ldap-sync-code-${++codeCounter}`;
      await app.model('authCode').create({ code, userId, clientId: CLIENT_ID, expires: new Date(Date.now() + 60000), scope: [] });

      const { body } = await app
        .request()
        .post('/oauth/token')
        .type('form')
        .send({ grant_type: 'authorization_code', code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET })
        .expect(200);

      return { accessToken: body.access_token, refreshToken: body.refresh_token };
    }

    const refresh = (refreshToken: string) =>
      app
        .request()
        .post('/oauth/token')
        .type('form')
        .send({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: CLIENT_ID, client_secret: CLIENT_SECRET });

    // Put a value where task caches the user info of the access token.
    async function seedTaskCache(accessToken: string): Promise<void> {
      await Services.service('redis').set(getTaskTokenCacheKey(accessToken), { authUserId: userId }, 600);
    }

    const taskCache = (accessToken: string) => Services.service('redis').get(getTaskTokenCacheKey(accessToken));
    const countRows = async (model: 'accessToken' | 'refreshToken' | 'sessions'): Promise<number> => {
      if (model === 'accessToken') {
        return app.model('accessToken').count({ where: { userId } });
      }
      if (model === 'refreshToken') {
        return app.model('refreshToken').count({ where: { userId } });
      }
      return app.model('sessions').count({ where: { userId } });
    };
    const readData = async (): Promise<any> =>
      app
        .model('userServices')
        .findOne({ where: { userId, provider: 'ldap' } })
        .then((row) => row?.dataValues.data);

    beforeAll(async () => {
      await login().expect(200);
      userId = (await app.model('user').findOne({ where: { email: 'alice@example.org' } }))!.dataValues.userId;

      await app.model('client').create({
        clientId: CLIENT_ID,
        secret: CLIENT_SECRET,
        need_secret: true,
        redirectUri: ['http://test-client-site'],
        grants: ['authorization_code', 'refresh_token'],
        scope: [],
        client_name: 'Ldap sync client',
        need_scope_approve: false,
      });
      await ldapModify(
        ADMIN_DN,
        ADMIN_PASSWORD,
        `dn: ${UNIT_GROUP}\nchangetype: add\nobjectClass: groupOfNames\ncn: liquio-unit\nmember: ${ALICE_DN}\nmember: ${PLACEHOLDER_MEMBER}\n`,
        '/tmp/unit-group.ldif',
      );
    });

    it('should leave a user who still has access untouched', async () => {
      const { accessToken } = await issueTokens();
      await seedTaskCache(accessToken);
      // The unit group has just been created with Alice in it: the first run records it.
      await Services.service('ldapSync').run();
      const before = await readData();
      expect(before.groups).toEqual(expect.arrayContaining([ACCESS_GROUP, UNIT_GROUP]));
      await seedTaskCache(accessToken);

      const summary = await Services.service('ldapSync').run();

      expect(summary).toMatchObject({ checked: 1, revoked: 0, changed: 0, errors: 0, aborted: false });
      expect(await readData()).toEqual(before);
      expect(await countRows('accessToken')).toBeGreaterThan(0);
      expect(await taskCache(accessToken)).not.toBeNull();
    });

    it('should not start a run while another replica holds the lock', async () => {
      const redis = Services.service('redis');
      const token = await redis.acquireLock('ldap-sync', 60);
      expect(token).not.toBeNull();

      try {
        expect(await Services.service('ldapSync').run()).toBeUndefined();
      } finally {
        await redis.releaseLock('ldap-sync', token!);
      }

      expect(await Services.service('ldapSync').run()).toMatchObject({ checked: 1 });
    });

    it('should update groups and drop the task cache, but keep the tokens, when a group is removed', async () => {
      const { accessToken } = await issueTokens();
      await seedTaskCache(accessToken);
      const before = await readData();
      await removeFrom(UNIT_GROUP);

      const summary = await Services.service('ldapSync').run();

      expect(summary).toMatchObject({ checked: 1, revoked: 0, changed: 1 });
      const data = await readData();
      expect(data.groups).toEqual([ACCESS_GROUP]);
      expect(data.accessGroups).toEqual([ACCESS_GROUP]);
      expect(data.syncedAt).not.toBe(before.syncedAt);
      expect(await taskCache(accessToken)).toBeNull();
      expect(await app.model('accessToken').count({ where: { accessToken } })).toBe(1);
      expect(await countRows('sessions')).toBeGreaterThan(0);
    });

    it('should refresh a token while the user is in the access group', async () => {
      const { refreshToken } = await issueTokens();

      const before = await countRows('accessToken');

      // The endpoint answers an empty body for this grant; the effect is a new token pair and the used refresh token being spent.
      await refresh(refreshToken).expect(200);

      expect(await countRows('accessToken')).toBe(before + 1);
      expect(await app.model('refreshToken').count({ where: { refreshToken } })).toBe(0);
    });

    it('should revoke tokens, sessions and the task cache when the user leaves the access group', async () => {
      const { accessToken, refreshToken } = await issueTokens();
      await seedTaskCache(accessToken);
      await login().expect(200);
      expect(await countRows('sessions')).toBeGreaterThan(0);
      await removeFrom(ACCESS_GROUP);

      const summary = await Services.service('ldapSync').run();

      expect(summary).toMatchObject({ checked: 1, revoked: 1, errors: 0 });
      expect(await countRows('accessToken')).toBe(0);
      expect(await countRows('refreshToken')).toBe(0);
      expect(await countRows('sessions')).toBe(0);
      expect(await taskCache(accessToken)).toBeNull();
      expect(await readData()).toMatchObject({ groups: [], accessGroups: [] });
      expect((await app.model('user').findOne({ where: { userId } }))?.dataValues.isActive).toBe(true);
      await refresh(refreshToken).expect(401);
    });

    it('should not touch an already revoked user again', async () => {
      const before = await readData();

      const summary = await Services.service('ldapSync').run();

      expect(summary).toMatchObject({ checked: 1, revoked: 0, changed: 0 });
      expect(await readData()).toEqual(before);
    });

    it('should refuse to log in again until the user is back in the access group', async () => {
      await login().expect(401);

      await addTo(ACCESS_GROUP);

      await login().expect(200);
      expect(await readData()).toMatchObject({ groups: [ACCESS_GROUP], accessGroups: [ACCESS_GROUP] });
    });

    it('should reject the refresh and revoke when access is lost between two syncs', async () => {
      const { accessToken, refreshToken } = await issueTokens();
      await seedTaskCache(accessToken);
      await removeFrom(ACCESS_GROUP);

      await refresh(refreshToken).expect(401);

      expect(await countRows('accessToken')).toBe(0);
      expect(await countRows('refreshToken')).toBe(0);
      expect(await countRows('sessions')).toBe(0);
      expect(await taskCache(accessToken)).toBeNull();
      expect(await readData()).toMatchObject({ groups: [], accessGroups: [] });
    });

    it('should revoke at once through the service endpoint', async () => {
      await addTo(ACCESS_GROUP);
      await login().expect(200);
      const { accessToken } = await issueTokens();
      await seedTaskCache(accessToken);
      await removeFrom(ACCESS_GROUP);

      await app
        .request()
        .post(`/user/ldap/sync/${userId}`)
        .set(basicHeader())
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ userId, status: 'revoked', reason: 'not-in-access-group' });
        });

      expect(await countRows('accessToken')).toBe(0);
      expect(await taskCache(accessToken)).toBeNull();
    });

    it('should require basic auth on the service endpoint', async () => {
      await app.request().post(`/user/ldap/sync/${userId}`).expect(401);
    });

    it('should answer 404 on the service endpoint for a user without an ldap record', async () => {
      await app
        .request()
        .post(`/user/ldap/sync/${'f'.repeat(24)}`)
        .set(basicHeader())
        .expect(404);
    });

    it('should revoke a user who was deleted in the directory', async () => {
      await addTo(ACCESS_GROUP);
      await login().expect(200);
      await issueTokens();
      await ldapModify(ADMIN_DN, ADMIN_PASSWORD, `dn: ${ALICE_DN}\nchangetype: delete\n`, '/tmp/delete.ldif');

      await app
        .request()
        .post(`/user/ldap/sync/${userId}`)
        .set(basicHeader())
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({ status: 'revoked', reason: 'deleted' });
        });

      expect(await countRows('accessToken')).toBe(0);
    });
  });
});

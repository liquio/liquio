import { createHash } from 'crypto';

import { Strategy } from 'passport-local';

import { LdapAmbiguousUserError, normalizeDn } from '../services/ldap.service';
import { Models } from '../models';
import { Services } from '../services';
import { ldap } from './ldap';

jest.mock('passport-local', () => ({ Strategy: jest.fn() }));
jest.mock('../lib/helpers', () => ({ delay: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../middleware/session', () => ({ saveSession: jest.fn() }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance } };
});

const ACCESS_GROUP = 'CN=LIQUIO-PROD-USERS,OU=Groups,DC=DOMAIN,DC=LOC';
const GUID = 'aabbccddeeff00112233445566778899';
const sha = (value: string) => `#${createHash('sha256').update(value).digest('hex')}`;

describe('ldap strategy', () => {
  let verify: (username: any, password: any, done: jest.Mock) => Promise<void>;
  let app: any;
  let ldapService: any;
  let redis: any;
  let userModel: any;
  let userServicesModel: any;
  let loginHistoryModel: any;
  let entry: any;
  let linkByEmail: boolean;

  async function setup(ldapConfig: Record<string, any> = {}) {
    app = {
      config: {
        auth_providers: {
          ldap: {
            isEnabled: true,
            accessGroups: [ACCESS_GROUP],
            attributes: { email: 'mail', first_name: 'givenName', last_name: 'sn' },
            linkByEmail,
            ...ldapConfig,
          },
        },
      },
      passport: { use: jest.fn(), authenticate: jest.fn().mockReturnValue('authenticate-mw'), mapping: {} },
      post: jest.fn(),
    };
    await ldap(app);
    const ctorArgs = (Strategy as unknown as jest.Mock).mock.calls.slice(-1)[0];
    verify = ctorArgs?.[1];
  }

  beforeEach(() => {
    jest.clearAllMocks();
    linkByEmail = false;

    entry = {
      dn: 'CN=John Doe,OU=Staff,DC=DOMAIN,DC=LOC',
      sAMAccountName: 'jdoe',
      userPrincipalName: 'jdoe@domain.loc',
      cn: 'John Doe',
      mail: 'John.Doe@Domain.loc',
      givenName: 'John',
      sn: 'Doe',
    };

    ldapService = {
      findUser: jest.fn().mockResolvedValue(entry),
      verifyPassword: jest.fn().mockResolvedValue(true),
      isAccountDisabled: jest.fn().mockReturnValue(false),
      getUserGroups: jest.fn().mockResolvedValue([ACCESS_GROUP, 'CN=Other,DC=DOMAIN,DC=LOC']),
      getUserId: jest.fn().mockReturnValue(GUID),
      isSameDn: jest.fn((a: string, b: string) => normalizeDn(a) === normalizeDn(b)),
    };
    redis = {
      createKey: jest.fn((...args: string[]) => args.join('.')),
      increment: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(1),
    };
    userModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (data: any) => ({ dataValues: { userId: 'new-user', ...data } })),
      update: jest.fn().mockResolvedValue([1]),
    };
    userServicesModel = {
      findOne: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(async (data: any) => [{ dataValues: { id: 1, ...data } }]),
    };
    loginHistoryModel = { create: jest.fn().mockResolvedValue({}) };

    (Services.service as jest.Mock).mockImplementation((name: string) => {
      const services: Record<string, any> = {
        ldap: ldapService,
        redis,
        passwordManager: { maxAttempts: 5, maxAttemptDelay: 300 },
      };
      return services[name];
    });
    (Models.model as jest.Mock).mockImplementation((name: string) => {
      const models: Record<string, any> = { user: userModel, userServices: userServicesModel, loginHistory: loginHistoryModel };
      return models[name];
    });
  });

  describe('setup', () => {
    it('does nothing when the provider is disabled', async () => {
      await setup({ isEnabled: false });
      expect(app.passport.use).not.toHaveBeenCalled();
      expect(app.post).not.toHaveBeenCalled();
    });

    it('registers the strategy, mapping and route', async () => {
      await setup();
      expect(Strategy).toHaveBeenCalledWith({ usernameField: 'username', passwordField: 'password' }, expect.any(Function));
      expect(app.passport.use).toHaveBeenCalledWith('ldap', expect.anything());
      expect(app.passport.mapping['ldap']).toEqual({ userIdentificationType: 'ldap' });
      expect(app.post).toHaveBeenCalledWith('/authorise/ldap', 'authenticate-mw', expect.any(Function));
    });
  });

  describe('authorise handler', () => {
    it('saves the session, writes login history and redirects to continue', async () => {
      await setup();
      const authorise = app.post.mock.calls[0][2];
      const req: any = {
        session: { passport: { user: { userId: 'u1', email: 'a@b' } } },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        user: { userId: 'u1', email: 'a@b' },
      };
      const res: any = { send: jest.fn() };

      await authorise(req, res);

      expect(loginHistoryModel.create).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith({ error: null, redirect: '/authorise/continue/' });
    });
  });

  describe('verify', () => {
    it('creates a new user on first login', async () => {
      await setup();
      const done = jest.fn();

      await verify('  JDoe ', 'secret', done);

      expect(ldapService.findUser).toHaveBeenCalledWith('JDoe');
      expect(ldapService.verifyPassword).toHaveBeenCalledWith(entry.dn, 'secret');
      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john.doe@domain.loc',
          first_name: 'John',
          last_name: 'Doe',
          ipn: sha(GUID),
          needOnboarding: false,
          userIdentificationType: 'ldap',
        }),
        { returning: true },
      );
      expect(userServicesModel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user',
          provider: 'ldap',
          provider_id: GUID,
          data: expect.objectContaining({
            sAMAccountName: 'jdoe',
            userPrincipalName: 'jdoe@domain.loc',
            dn: entry.dn,
            cn: 'John Doe',
            accessGroups: [ACCESS_GROUP],
            groups: [ACCESS_GROUP, 'CN=Other,DC=DOMAIN,DC=LOC'],
            syncedAt: expect.any(String),
          }),
        }),
        { conflictFields: ['provider', 'provider_id'] },
      );
      expect(redis.delete).toHaveBeenCalledWith('auth-ldap.jdoe');
      const session = done.mock.calls[0][1];
      expect(done.mock.calls[0][0]).toBeNull();
      expect(session).toEqual(expect.objectContaining({ userId: 'new-user', provider: 'ldap' }));
      expect(session.services.ldap.provider).toBe('ldap');
      expect(JSON.stringify(session)).not.toContain('secret');
    });

    it('updates the user of an existing ldap service and replaces the ipn', async () => {
      await setup();
      userServicesModel.findOne.mockResolvedValue({ dataValues: { id: 7, userId: 'u1', provider: 'ldap', provider_id: GUID } });
      userModel.findOne.mockResolvedValue({ dataValues: { userId: 'u1', ipn: '1234567890', needOnboarding: true } });
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(userModel.create).not.toHaveBeenCalled();
      expect(userModel.update).toHaveBeenCalledWith(expect.objectContaining({ ipn: sha(GUID), needOnboarding: false, first_name: 'John' }), {
        where: { userId: 'u1' },
      });
      expect(done.mock.calls[0][1]).toEqual(expect.objectContaining({ userId: 'u1', ipn: sha(GUID), needOnboarding: false }));
    });

    it('does not link an existing user with the same email when linkByEmail is false', async () => {
      await setup();
      userModel.findOne.mockResolvedValue({ dataValues: { userId: 'other', email: 'john.doe@domain.loc', ipn: '1234567890' } });
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Invalid login or password.' });
      expect(userModel.create).not.toHaveBeenCalled();
      expect(userModel.update).not.toHaveBeenCalled();
      expect(userServicesModel.upsert).not.toHaveBeenCalled();
    });

    it('links an existing user with the same email when linkByEmail is true', async () => {
      linkByEmail = true;
      await setup();
      userModel.findOne.mockResolvedValue({ dataValues: { userId: 'other', email: 'john.doe@domain.loc', ipn: '1234567890' } });
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(userModel.create).not.toHaveBeenCalled();
      expect(userModel.update).toHaveBeenCalledWith(expect.objectContaining({ ipn: sha(GUID) }), { where: { userId: 'other' } });
      expect(userServicesModel.upsert).toHaveBeenCalledWith(expect.objectContaining({ userId: 'other', provider: 'ldap' }), expect.anything());
      expect(done.mock.calls[0][1]).toEqual(expect.objectContaining({ userId: 'other', provider: 'ldap' }));
    });

    it('rejects a wrong password with the generic error', async () => {
      await setup();
      ldapService.verifyPassword.mockResolvedValue(false);
      const done = jest.fn();

      await verify('jdoe', 'wrong', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Invalid login or password.' });
      expect(ldapService.getUserGroups).not.toHaveBeenCalled();
      expect(redis.delete).not.toHaveBeenCalled();
    });

    it('rejects an empty password without querying the directory', async () => {
      await setup();
      const done = jest.fn();

      await verify('jdoe', '', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Invalid login or password.' });
      expect(ldapService.findUser).not.toHaveBeenCalled();
    });

    it('rejects an unknown user with the generic error', async () => {
      await setup();
      ldapService.findUser.mockResolvedValue(null);
      const done = jest.fn();

      await verify('nobody', 'secret', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Invalid login or password.' });
      expect(ldapService.verifyPassword).not.toHaveBeenCalled();
    });

    it('rejects an ambiguous login with the generic error', async () => {
      await setup();
      ldapService.findUser.mockRejectedValue(new LdapAmbiguousUserError());
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Invalid login or password.' });
    });

    it('rejects a disabled account with the generic error', async () => {
      await setup();
      ldapService.isAccountDisabled.mockReturnValue(true);
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Invalid login or password.' });
      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('rejects a user outside of the access groups with the generic error', async () => {
      await setup();
      ldapService.getUserGroups.mockResolvedValue(['CN=Other,DC=DOMAIN,DC=LOC']);
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Invalid login or password.' });
      expect(userModel.create).not.toHaveBeenCalled();
      expect(userServicesModel.upsert).not.toHaveBeenCalled();
    });

    it('accepts a nested group returned with a differently cased DN', async () => {
      await setup();
      ldapService.getUserGroups.mockResolvedValue(['cn=liquio-prod-users, ou=groups, dc=domain, dc=loc']);
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toBeNull();
      expect(userServicesModel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accessGroups: [ACCESS_GROUP] }) }),
        expect.anything(),
      );
    });

    it('returns 429 when the attempt limit is exceeded', async () => {
      await setup();
      redis.increment.mockResolvedValue(6);
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 429 });
      expect(ldapService.findUser).not.toHaveBeenCalled();
    });

    it('counts attempts per lowercased and trimmed username', async () => {
      await setup();
      const done = jest.fn();

      await verify('  JDoe  ', 'secret', done);

      expect(redis.createKey).toHaveBeenCalledWith('auth-ldap', 'jdoe');
      expect(redis.increment).toHaveBeenCalledWith('auth-ldap.jdoe', 1, 300);
    });

    it('returns 503 without details when the directory fails', async () => {
      await setup();
      ldapService.findUser.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:636'));
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      const error = done.mock.calls[0][0];
      expect(error).toMatchObject({ status: 503 });
      expect(error.message).not.toContain('ECONNREFUSED');
      expect(redis.delete).not.toHaveBeenCalled();
    });

    it('returns 503 when the password check fails with a connection error', async () => {
      await setup();
      ldapService.verifyPassword.mockRejectedValue(new Error('socket hang up'));
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 503 });
    });

    it('rejects with the generic error when the email is already used and the user is not linkable', async () => {
      await setup();
      userModel.create.mockRejectedValue(Object.assign(new Error('unique'), { name: 'SequelizeUniqueConstraintError', fields: { phone: 'x' } }));
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Invalid login or password.' });
    });

    it('passes unexpected database errors on', async () => {
      await setup();
      userModel.create.mockRejectedValue(new Error('db down'));
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(done.mock.calls[0][0]).toEqual(new Error('db down'));
    });

    it('takes the first string of array and Buffer attribute values', async () => {
      await setup({ attributes: { first_name: 'givenName', last_name: 'sn', phone: 'telephoneNumber' } });
      entry.givenName = [Buffer.from('Іван'), 'Other'];
      entry.sn = ['Петренко'];
      entry.telephoneNumber = Buffer.from('+380501112233');
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'Іван', last_name: 'Петренко', phone: '+380501112233' }),
        expect.anything(),
      );
    });

    it('does not map protected user fields from the directory', async () => {
      await setup({ attributes: { role: 'description', ipn: 'employeeID', isActive: 'extensionAttribute1', first_name: 'givenName' } });
      entry.description = 'admin';
      entry.employeeID = '1234567890';
      entry.extensionAttribute1 = 'true';
      const done = jest.fn();

      await verify('jdoe', 'secret', done);

      const created = userModel.create.mock.calls[0][0];
      expect(created.role).toBeUndefined();
      expect(created.isActive).toBeUndefined();
      expect(created.ipn).toBe(sha(GUID));
    });
  });
});

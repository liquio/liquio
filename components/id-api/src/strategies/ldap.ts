import { createHash } from 'crypto';

import { Strategy } from 'passport-local';
import { Log } from '@liquio/back-core';
import { Entry } from 'ldapts';
import { col, fn, where } from 'sequelize';

import { delay } from '../lib/helpers';
import { HttpError } from '../lib/http_error';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { saveSession } from '../middleware/session';
import { Models, UserAttributes, UserServicesAttributes } from '../models';
import { Services } from '../services';
import { LdapAmbiguousUserError, firstString } from '../services/ldap.service';
import { CallbackFn, Express, Request, Response } from '../types';

const GENERIC_FAIL_DESCRIPTION = 'Invalid login or password.';
const UNAVAILABLE_DESCRIPTION = 'Authentication service is temporarily unavailable. Please try again later.';

// User fields that must never be filled from the directory, whatever the `attributes` mapping says.
const PROTECTED_USER_FIELDS = [
  'userId',
  'role',
  'ipn',
  'password',
  'isActive',
  'needOnboarding',
  'onboardingTaskId',
  'userIdentificationType',
  'createdAt',
  'updatedAt',
];

// Thrown inside the verify flow to finish it with a generic failure; the real reason is already logged.
class LdapLoginRejected extends Error {}

// No external IdP session to tear down for ldap auth.
export async function logout(): Promise<void> {}

export async function ldap(app: Express): Promise<void> {
  const log = Log.getInstance();
  const cfg = app.config.auth_providers.ldap;

  if (!cfg?.isEnabled) {
    log.save('ldap-strategy', { status: 'disabled' }, 'info');
    return;
  }

  const passwordManager = Services.service('passwordManager');
  const accessGroups = cfg.accessGroups ?? [];

  async function authenticateInDirectory(
    username: string,
    password: string,
  ): Promise<{ entry: Entry; providerId: string; groups: string[]; matched: string[] }> {
    const ldapService = Services.service('ldap');

    const entry = await ldapService.findUser(username);
    if (!entry) {
      log.save('user-auth-by-ldap|user-not-found', { username }, 'info');
      throw new LdapLoginRejected();
    }

    if (!(await ldapService.verifyPassword(entry.dn, password))) {
      log.save('user-auth-by-ldap|password-invalid', { username }, 'info');
      throw new LdapLoginRejected();
    }

    if (ldapService.isAccountDisabled(entry)) {
      log.save('user-auth-by-ldap|account-disabled', { username }, 'info');
      throw new LdapLoginRejected();
    }

    const groups = await ldapService.getUserGroups(entry);
    const matched = accessGroups.filter((accessGroup) => groups.some((group) => ldapService.isSameDn(group, accessGroup)));
    if (matched.length === 0) {
      log.save('user-auth-by-ldap|not-in-access-group', { username }, 'info');
      throw new LdapLoginRejected();
    }

    return { entry, providerId: ldapService.getUserId(entry), groups, matched };
  }

  // Map the configured directory attributes to user fields.
  function mapAttributes(entry: Entry): Partial<UserAttributes> {
    const mapped: Record<string, unknown> = {};
    for (const [field, attribute] of Object.entries(cfg?.attributes ?? {})) {
      if (PROTECTED_USER_FIELDS.includes(field)) {
        continue;
      }
      const value = firstString(entry[attribute]);
      if (value !== undefined) {
        mapped[field] = field === 'email' ? value.toLowerCase() : value;
      }
    }
    return mapped as Partial<UserAttributes>;
  }

  async function findUserByEmail(email: string): Promise<UserAttributes | undefined> {
    return Models.model('user')
      .findOne({ where: where(fn('lower', col('email')), email.toLowerCase()) })
      .then((row) => row?.dataValues as UserAttributes | undefined);
  }

  async function upsertUser(
    username: string,
    entry: Entry,
    providerId: string,
    groups: string[],
    matched: string[],
  ): Promise<{ user: UserAttributes; service: UserServicesAttributes }> {
    const userData: Partial<UserAttributes> = {
      ...mapAttributes(entry),
      // The ipn is always derived from the directory id so that ldap users never carry a real RNOKPP.
      ipn: `#${createHash('sha256').update(providerId).digest('hex')}`,
      // Profile data comes from the directory, so confirmation of phone and email is skipped.
      needOnboarding: false,
      // Lets `allowIdentificationTypes` include or exclude ldap users.
      userIdentificationType: 'ldap',
    };

    let existingUser: UserAttributes | undefined;

    const existingService = await Models.model('userServices')
      .findOne({ where: { provider: 'ldap', provider_id: providerId } })
      .then((row) => row?.dataValues);

    if (existingService) {
      existingUser = await Models.model('user')
        .findOne({ where: { userId: existingService.userId } })
        .then((row) => row?.dataValues as UserAttributes | undefined);
    } else if (userData.email) {
      const userByEmail = await findUserByEmail(userData.email);
      if (userByEmail && !cfg?.linkByEmail) {
        log.save('user-auth-by-ldap|email-conflict', { username, userId: userByEmail.userId }, 'warning');
        throw new LdapLoginRejected();
      }
      existingUser = userByEmail;
    }

    let user: UserAttributes;
    try {
      if (existingUser) {
        await Models.model('user').update(userData, { where: { userId: existingUser.userId } });
        user = { ...existingUser, ...userData };
      } else {
        user = await Models.model('user')
          .create(userData, { returning: true })
          .then((row) => row.dataValues);
      }
    } catch (error: any) {
      // Unique email, phone or ipn taken by another user.
      if (error?.name === 'SequelizeUniqueConstraintError') {
        log.save('user-auth-by-ldap|user-conflict', { username, fields: Object.keys(error.fields ?? {}) }, 'warning');
        throw new LdapLoginRejected();
      }
      throw error;
    }

    log.save('user-auth-by-ldap|user-upsert', { userId: user.userId, is_new: !existingUser }, 'info');

    const [userServiceRecord] = await Models.model('userServices').upsert(
      {
        userId: user.userId,
        provider: 'ldap',
        provider_id: providerId,
        data: {
          sAMAccountName: firstString(entry.sAMAccountName),
          userPrincipalName: firstString(entry.userPrincipalName),
          dn: entry.dn,
          cn: firstString(entry.cn),
          groups,
          accessGroups: matched,
          syncedAt: new Date().toISOString(),
        },
      },
      { conflictFields: ['provider', 'provider_id'] },
    );

    return { user, service: userServiceRecord.dataValues };
  }

  async function verify(rawUsername: string, password: string, done: CallbackFn): Promise<void> {
    // Waiting for a random time to prevent timing attacks
    await delay(Math.floor(Math.random() * 400) + 100);

    const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
    const redis = Services.service('redis');
    const counterKey = redis.createKey('auth-ldap', username.toLowerCase());

    // Count the number of attempts
    const attemptCounter = await redis.increment(counterKey, 1, passwordManager.maxAttemptDelay);

    // Do not try to login if the number of attempts exceeds the limit until the maxAttemptDelay expires
    if (attemptCounter > passwordManager.maxAttempts) {
      log.save('user-auth-by-ldap|bruteforce-alert', { username, attemptCounter }, 'info');
      return done(new HttpError(429, 'Too many attempts. Please try again later.'));
    }

    if (!username || typeof password !== 'string' || !password) {
      log.save('user-auth-by-ldap|empty-credentials', {}, 'info');
      return done(new HttpError(401, GENERIC_FAIL_DESCRIPTION));
    }

    let directoryResult: Awaited<ReturnType<typeof authenticateInDirectory>>;
    try {
      directoryResult = await authenticateInDirectory(username, password);
    } catch (error: any) {
      if (error instanceof LdapLoginRejected || error instanceof LdapAmbiguousUserError) {
        return done(new HttpError(401, GENERIC_FAIL_DESCRIPTION));
      }
      // The directory could not be queried: do not tell the user that the password is wrong.
      log.save('user-auth-by-ldap|directory-error', { username, error: error?.message ?? `${error}` }, 'error');
      return done(new HttpError(503, UNAVAILABLE_DESCRIPTION));
    }

    try {
      const { entry, providerId, groups, matched } = directoryResult;
      const { user, service } = await upsertUser(username, entry, providerId, groups, matched);

      // Reset the attempt counter
      await redis.delete(counterKey);

      const session = {
        ...user,
        provider: 'ldap',
        services: { ldap: service },
      };

      return done(null, session);
    } catch (error: any) {
      if (error instanceof LdapLoginRejected) {
        return done(new HttpError(401, GENERIC_FAIL_DESCRIPTION));
      }
      log.save('user-auth-by-ldap|error', { username, error: error?.message ?? `${error}` }, 'error');
      return done(error);
    }
  }

  async function authorise(req: Request, res: Response): Promise<void> {
    const user = req.session.passport?.user;

    await saveSession(req, user);

    const { userId, email } = req.session.passport?.user ?? {};

    const loginHistoryData = prepareLoginHistoryData(req, { actionType: 'login' });

    await Models.model('loginHistory').create(loginHistoryData);

    log.save('user-auth-by-ldap|success', { userId, email }, 'info');

    res.send({ error: null, redirect: '/authorise/continue/' });
  }

  // Instantiate the strategy.
  const strategy = new Strategy({ usernameField: 'username', passwordField: 'password' }, verify);

  // Declare the use of ldap strategy.
  app.passport.use('ldap', strategy);

  // The mapping is applied to the user_services data after login and must exist for every provider.
  app.passport.mapping['ldap'] = {
    userIdentificationType: 'ldap',
  };

  // Define the ldap authorisation route.
  app.post('/authorise/ldap', app.passport.authenticate('ldap', { keepSessionInfo: true }), authorise);

  log.save('ldap-strategy', { status: 'initialized' }, 'info');
}

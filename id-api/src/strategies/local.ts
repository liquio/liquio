import { Strategy } from 'passport-local';

import { delay } from '../lib/helpers';
import { HttpError } from '../lib/http_error';
import { Log } from '../lib/log';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { saveSession } from '../middleware/session';
import { Models, UserAttributes, UserServicesAttributes } from '../models';
import { Services } from '../services';
import { CallbackFn, Express, Request, Response } from '../types';

const GENERIC_FAIL_DESCRIPTION = 'Invalid email or password.';

export async function local(app: Express) {
  const log = Log.get();

  if (!app.config.auth_providers.local?.isEnabled) {
    log.save('local-strategy', { status: 'disabled' }, 'info');
    return;
  }

  const passwordManager = Services.service('passwordManager');

  async function verify(email: string, password: string, done: CallbackFn) {
    // Waiting for a random time to prevent timing attacks
    await delay(Math.floor(Math.random() * 400) + 100);

    const counterKey = Services.service('redis').createKey('auth-local', email);

    // Count the number of attempts
    const attemptCounter = await Services.service('redis').increment(counterKey, 1, passwordManager.maxAttemptDelay);

    // Do not try to login if the number of attempts exceeds the limit until the maxAttemptDelay expires
    if (attemptCounter > passwordManager.maxAttempts) {
      log.save('user-auth-by-local|bruteforce-alert', { email, attemptCounter }, 'info');
      return done(new HttpError(429, 'Too many attempts. Please try again later.'));
    }

    try {
      // Find user by email
      const user = await Models.model('user')
        .findOne({
          where: { email },
          include: [{ model: Models.model('userServices') }],
        })
        .then((row) => row?.dataValues as UserAttributes & { user_services: UserServicesAttributes[] });

      if (!user) {
        log.save('user-auth-by-local|user-not-found', { email }, 'info');
        return done(new HttpError(401, GENERIC_FAIL_DESCRIPTION));
      }

      const localServiceInfo = user.user_services.find((s: any) => s.provider === 'local');
      if (!localServiceInfo) {
        log.save('user-auth-by-local|user-credentials-not-found', { email }, 'info');
        return done(new HttpError(401, GENERIC_FAIL_DESCRIPTION));
      }

      const passwordHash = (localServiceInfo?.data as any).password;
      if (!passwordHash) {
        log.save('user-auth-by-local|user-no-password', { email }, 'info');
        return done(new HttpError(401, GENERIC_FAIL_DESCRIPTION));
      }

      // Validate password
      const isPasswordValid = await passwordManager.verifyPassword(password, passwordHash);
      if (!isPasswordValid) {
        log.save('user-auth-by-local|password-invalid', { email }, 'info');
        return done(new HttpError(401, GENERIC_FAIL_DESCRIPTION));
      }

      // Reset the attempt counter
      await Services.service('redis').delete(counterKey);

      // Do not pass the password hash data further down the session
      const sanitizedLocalServiceInfo = {
        ...localServiceInfo,
        password: '****',
        oldPasswords: ((localServiceInfo?.data as any).oldPasswords ?? []).map(() => '****'),
      };

      const session = {
        userId: user.userId,
        email: user.email,
        services: { local: sanitizedLocalServiceInfo },
        provider: 'local',
      };

      // If the account has EDS service info, switch to that
      const edsServiceInfo = user.user_services.find((s: any) => s.provider === 'eds');
      if (edsServiceInfo) {
        (session.services as any).eds = { ...edsServiceInfo };
        session.provider = 'eds';
      }

      // If validation succeeds, return the user object
      return done(null, session);
    } catch (error: any) {
      log.save('user-auth-by-local|error', { error }, 'error');
      return done(error);
    }
  }

  async function authorise(req: Request, res: Response): Promise<void> {
    const user = req.session.passport?.user;

    await saveSession(req, user);

    const { userId, email } = req.session.passport?.user ?? {};

    const loginHistoryData = prepareLoginHistoryData(req, { actionType: 'login' });

    await Models.model('loginHistory').create(loginHistoryData);

    log.save('user-auth-by-local|success', { userId, email }, 'info');

    res.send({ error: null, redirect: '/authorise/continue/' });
  }

  async function changePassword(req: Request, res: Response): Promise<void> {
    // Waiting for a random time to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 400) + 100));

    const { email, oldPassword, newPassword } = req.body;

    // Validate fields
    if (!email || !oldPassword || !newPassword) {
      res.status(400).send({ error: 'Invalid request.' });
      return;
    }

    const counterKey = Services.service('redis').createKey('auth-local', email);

    // Count the number of attempts
    const attemptCounter = await Services.service('redis').increment(counterKey, 1, passwordManager.maxAttemptDelay);

    // Do not try to change password if the number of attempts exceeds the limit until the maxAttemptDelay expires
    if (attemptCounter > passwordManager.maxAttempts) {
      log.save('user-auth-by-local|bruteforce-alert', { email, attemptCounter }, 'info');
      res.status(429).send({ error: 'Too many attempts. Please try again later.' });
      return;
    }

    const { strong, reason } = passwordManager.isStrongPassword(newPassword);
    if (!strong) {
      log.save('user-change-password|weak-password', { email, reason }, 'info');
      res.status(400).send({ error: reason });
      return;
    }

    try {
      const user = await Models.model('user')
        .findOne({
          where: { email },
          include: [{ model: Models.model('userServices') }],
        })
        .then((row) => row?.dataValues as UserAttributes & { user_services: UserServicesAttributes[] });

      if (!user) {
        log.save('user-change-password|user-not-found', { email }, 'info');
        res.status(401).send({ error: GENERIC_FAIL_DESCRIPTION });
        return;
      }

      const localServiceInfo = user.user_services.find((s) => s.provider === 'local');
      if (!localServiceInfo) {
        log.save('user-change-password|user-credentials-not-found', { email }, 'info');
        res.status(401).send({ error: GENERIC_FAIL_DESCRIPTION });
        return;
      }

      const currentPasswordHash = (localServiceInfo.data as any)?.password;
      if (!currentPasswordHash) {
        log.save('user-change-password|no-password', { email }, 'info');
        res.status(401).send({ error: GENERIC_FAIL_DESCRIPTION });
        return;
      }

      const isPasswordValid = await passwordManager.verifyPassword(oldPassword, currentPasswordHash);
      if (!isPasswordValid) {
        log.save('user-change-password|password-invalid', { email }, 'info');
        res.status(401).send({ error: GENERIC_FAIL_DESCRIPTION });
        return;
      }

      // Make a list of current and old passwords and check if the new password is not the same as the old ones
      const oldPasswords = [currentPasswordHash].concat((localServiceInfo?.data as any)?.oldPasswords ?? []);
      if (oldPasswords.find((hash) => passwordManager.verifyPasswordSync(newPassword, hash))) {
        log.save('user-change-password|password-reused', { email }, 'info');
        res.status(400).send({ error: 'Password cannot be the same as the old ones.' });
        return;
      }

      // Generate a new password hash
      const passwordHash = await passwordManager.hashPassword(newPassword);

      // Keep only the latest `rememberLastPassword` password hashes
      oldPasswords.splice(passwordManager.rememberLastPassword, oldPasswords.length);

      // Update service record with new data
      await Models.model('userServices').update(
        { data: { password: passwordHash, oldPasswords, isChangeRequired: false } },
        { where: { id: localServiceInfo.id } },
      );

      // Reset the attempt counter
      await Services.service('redis').delete(counterKey);

      // Create login history record
      {
        req.user = user as any;
        const loginHistoryData = prepareLoginHistoryData(req, { actionType: 'change_password' });
        await Models.model('loginHistory').create(loginHistoryData);
      }

      log.save('user-change-password|success', { email }, 'info');

      res.send({ success: true });
    } catch (error) {
      log.save('user-change-password|error', { error }, 'error');
      res.status(401).send({ error: GENERIC_FAIL_DESCRIPTION });
    }
  }

  // Instantiate the strategy.
  const strategy = new Strategy({ usernameField: 'email', passwordField: 'password' }, verify);

  // Declare the use of local strategy.
  app.passport.use('local', strategy);

  app.passport.mapping['local'] = {
    userIdentificationType: 'email',
  };

  // Define the local authorisation route.
  app.post('/authorise/local', app.passport.authenticate('local', { keepSessionInfo: true }), authorise);

  // Expose user-accessible password change method.
  app.post('/authorise/local/change_password', changePassword);

  log.save('local-strategy', { status: 'initialized' }, 'info');
}

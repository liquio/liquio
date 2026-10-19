import { matchedData, query } from 'express-validator';
import { Op } from 'sequelize';

import { TOTP } from '../lib/totp';
import { getSessionUserId, markTwoFactorCompleted } from '../lib/two_factor';
import { AuthMiddleware } from '../middleware/authenticate';
import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

// A generated secret can be enabled only within this window.
const PENDING_SECRET_TTL_SECONDS = 10 * 60;

export class TotpController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'totp');
  }

  protected registerRoutes() {
    const authMiddleware = AuthMiddleware.get();

    // Handle TOTP verification.
    this.router.post('/authorise/totp', this.verifyTotp.bind(this));

    // Generate TOTP secret.
    // Note: Should be called from Cabinet API.
    this.router.get(
      '/totp/generate',
      [query('userId').optional().isString(), this.handleValidation.bind(this)],
      authMiddleware.basic('totp'),
      authMiddleware.userToken(() => this.requireUserToken()),
      this.generateTotp.bind(this),
    );

    // Enable TOTP secret.
    // Note: Should be called from Cabinet API.
    this.router.post(
      '/totp/enable',
      authMiddleware.basic('totp'),
      authMiddleware.userToken(() => this.requireUserToken()),
      this.enableTotpSecret.bind(this),
    );

    // Disable TOTP secret.
    // Note: Should be called from Cabinet API.
    this.router.post(
      '/totp/disable',
      authMiddleware.basic('totp'),
      authMiddleware.userToken(() => this.requireUserToken()),
      this.disableTotpSecret.bind(this),
    );
  }

  private requireUserToken(): boolean {
    return this.app.config.auth_providers?.totp?.requireUserToken === true;
  }

  /**
   * The user the operation is for. A verified user token wins: a different `userId` in the request is 403.
   * Without a token (legacy mode, see `auth_providers.totp.requireUserToken`) the caller supplied id is used.
   * Responds and returns undefined when the request has to stop.
   */
  private resolveUserId(req: Request, res: Response, claimed: unknown): string | undefined {
    const tokenUserId = (req.user as { id?: string } | undefined)?.id;
    if (tokenUserId) {
      if (claimed !== undefined && claimed !== null && claimed !== '' && claimed !== tokenUserId) {
        this.log.save('totp-user-mismatch', { userId: tokenUserId, claimed: String(claimed), client: req.serviceClient?.name }, 'warning');
        res.status(403).send({ error: 'Forbidden.' });
        return undefined;
      }
      return tokenUserId;
    }

    if (!claimed || typeof claimed !== 'string') {
      res.status(400).send({ error: '`userId` should be defined.' });
      return undefined;
    }
    return claimed;
  }

  private pendingKey(userId: string): string {
    return this.service('redis').createKey('totp-pending', userId);
  }

  /**
   * Revoke the other sessions of the user after the second factor changed.
   * The caller has to say which session to keep (`access_token`/`refresh_token` in the body), because the basic caller has no session of its own.
   * Without them nothing is revoked, so existing callers (cabinet-api) are not logged out.
   */
  private async revokeOtherSessions(userId: string, keep: { accessToken?: unknown; refreshToken?: unknown }): Promise<void> {
    if (typeof keep.accessToken !== 'string' || !keep.accessToken) {
      return;
    }

    await this.service('auth').invalidateUserTokenCache(userId, { ignoreCacheErrors: true });
    await this.model('accessToken').destroy({ where: { userId, accessToken: { [Op.ne]: keep.accessToken } } });
    await this.model('refreshToken').destroy({
      where: typeof keep.refreshToken === 'string' && keep.refreshToken ? { userId, refreshToken: { [Op.ne]: keep.refreshToken } } : { userId },
    });
    await this.model('sessions').destroy({ where: { userId } });
  }

  private async audit(req: Request, userId: string, change: string): Promise<void> {
    await this.model('userAdminAction').create({
      user_id: userId,
      data: { changes: { twoFactor: change } } as any,
      created_by: { service: req.serviceClient?.name ?? 'unknown' } as any,
      action_type: 'update',
    });
  }

  /**
   * A method to verify TOTP code for a user.
   */
  async verifyTotp(req: Request, res: Response): Promise<void> {
    // The session user is the authority; the local login does not fill `authInfo`.
    const userId = getSessionUserId(req) ?? req.session?.authInfo?.userId;
    if (!userId) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).send({ error: 'Code should be defined.' });
      return;
    }

    // Count the attempt before the verification, so parallel requests cannot exceed the limit (the increment is atomic in redis).
    // It is counted per user, so a new first factor session does not reset it, and it also guards a valid code during the lock.
    const passwordManager = this.service('passwordManager');
    const redis = this.service('redis');
    const attemptsKey = redis.createKey('auth-totp', userId);
    const attemptCounter = await redis.increment(attemptsKey, 1, passwordManager.maxAttemptDelay);
    if (attemptCounter > passwordManager.maxAttempts) {
      this.log.save('totp-verification|bruteforce-alert', { userId, attemptCounter }, 'warning');
      res.status(429).send({ error: 'Too many attempts. Please try again later.' });
      return;
    }

    try {
      // TOTP can complete only the factor that is currently configured for the account.
      const account = await this.model('user')
        .findOne({ where: { userId }, attributes: ['userId', 'useTwoFactorAuth', 'twoFactorType'] })
        .then((row) => row?.dataValues);

      if (!account?.useTwoFactorAuth || account.twoFactorType !== 'totp') {
        res.status(401).send({ error: 'TOTP is not enabled.' });
        return;
      }

      const secret = await this.model('userTotpSecret')
        .findOne({ where: { userId } })
        .then((row) => row?.dataValues);

      if (!secret) {
        res.status(401).send({ error: 'TOTP secret not found.' });
        return;
      }

      const totp = new TOTP(secret?.secret);

      const isValid = totp.validate(code);
      if (!isValid) {
        res.status(401).send({ error: 'Invalid code.' });
        return;
      }

      await markTwoFactorCompleted(req, userId, 'totp');

      // The factor is already verified, so a failed reset must not fail the response.
      await redis
        .delete(attemptsKey)
        .catch((error: any) => this.log.save('totp-verification|reset-attempts-error', { userId, error: error.message }, 'warn'));

      res.status(200).send({ success: true, redirect: '/authorise/continue' });
    } catch (error: any) {
      this.log.save('totp-verification-error', { error: error.message }, 'error');
      res.status(401).send({ error: 'TOTP validation error' });
    }
  }

  /**
   * Generate a TOTP secret for the user.
   */
  async generateTotp(req: Request, res: Response): Promise<void> {
    const claimed = matchedData<{ userId?: string }>(req, { locations: ['query'] }).userId;
    const userId = this.resolveUserId(req, res, claimed);
    if (!userId) {
      return;
    }

    try {
      const existingSecret = await this.model('userTotpSecret')
        .findOne({ where: { userId } })
        .then((row) => row?.dataValues);
      if (existingSecret) {
        this.log.save('totp-generate-warning', { userId }, 'warning');
        res.status(400).send({ error: 'TOTP is already generated.' });
        return;
      }

      // Generate a new secret and keep it pending, so only a server generated secret can be enabled.
      const secret = TOTP.createSecret();
      const totp = new TOTP(secret);
      const stored = await this.service('redis').set(this.pendingKey(userId), secret, PENDING_SECRET_TTL_SECONDS);
      if (!stored) {
        this.log.save('totp-generate-error', { userId, error: 'Unable to store the pending secret.' }, 'error');
        res.status(503).send({ error: 'TOTP generation is unavailable.' });
        return;
      }

      this.log.save('totp-generate-success', { userId }, 'info');
      res.status(201).send({ secret, uri: totp.toString() });
    } catch (error: any) {
      this.log.save('totp-generate-error', { error: error.message }, 'error');
      res.status(401).send({ error: 'TOTP generation error' });
    }
  }

  /**
   * Enable the TOTP secret for the user.
   */
  async enableTotpSecret(req: Request, res: Response): Promise<void> {
    // A `secret` in the body is ignored: only the secret generated by the server for this user can be enabled.
    const { code, access_token: accessToken, refresh_token: refreshToken } = req.body;

    const userId = this.resolveUserId(req, res, req.body.userId);
    if (!userId) {
      return;
    }
    if (!code || typeof code !== 'string') {
      res.status(400).send({ error: '`code` should be defined.' });
      return;
    }

    try {
      const user = await this.model('user')
        .findOne({ where: { userId } })
        .then((row) => row?.dataValues);
      if (!user) {
        res.status(400).send({ error: 'User not found.' });
        return;
      }

      // Do not allow to override existing 2FA settings
      if (user.useTwoFactorAuth) {
        this.log.save('totp-enable-warning', { userId }, 'warning');
        res.status(400).send({ error: 'TOTP is already enabled.' });
        return;
      }

      const redis = this.service('redis');
      const pendingKey = this.pendingKey(userId);
      const pendingSecret = await redis.get(pendingKey);
      if (!pendingSecret) {
        res.status(400).send({ error: 'No pending TOTP secret. Generate a new one.' });
        return;
      }

      // Count the attempt before the check (atomic increment), so parallel requests cannot exceed the limit.
      const passwordManager = this.service('passwordManager');
      const attemptsKey = redis.createKey('totp-enable', userId);
      const attemptCounter = await redis.increment(attemptsKey, 1, passwordManager.maxAttemptDelay);
      if (attemptCounter > passwordManager.maxAttempts) {
        this.log.save('totp-enable|bruteforce-alert', { userId, attemptCounter }, 'warning');
        res.status(429).send({ error: 'Too many attempts. Please try again later.' });
        return;
      }

      if (!new TOTP(pendingSecret).validate(code)) {
        res.status(401).send({ error: 'Invalid code.' });
        return;
      }

      // Create (or update) the secret in the database
      await this.model('userTotpSecret').upsert({ userId, secret: pendingSecret });

      // Update the user profile to enable TOTP
      await this.model('user').update({ useTwoFactorAuth: true, twoFactorType: 'totp' }, { where: { userId } });

      await redis.delete(pendingKey).catch(() => undefined);
      await redis.delete(attemptsKey).catch(() => undefined);

      await this.audit(req, userId, 'totp enabled');
      await this.revokeOtherSessions(userId, { accessToken, refreshToken });

      this.log.save('totp-enable-success', { userId }, 'info');
      res.status(201).send({ success: true });
    } catch (error: any) {
      this.log.save('totp-enable-error', { error: error.message }, 'error');
      res.status(401).send({ error: 'TOTP enable error' });
    }
  }

  /**
   * Disable the TOTP secret for the user
   */
  async disableTotpSecret(req: Request, res: Response): Promise<void> {
    const { code, access_token: accessToken, refresh_token: refreshToken } = req.body;

    const userId = this.resolveUserId(req, res, req.body.userId);
    if (!userId) {
      return;
    }
    if (!code) {
      res.status(400).send({ error: '`code` should be defined.' });
      return;
    }

    try {
      const user = await this.model('user')
        .findOne({ where: { userId } })
        .then((row) => row?.dataValues);

      if (!user) {
        res.status(400).send({ error: 'User not found.' });
        return;
      }

      if (!user.useTwoFactorAuth || user.twoFactorType !== 'totp') {
        res.status(400).send({ error: 'TOTP is not enabled.' });
        return;
      }
    } catch (error: any) {
      this.log.save('totp-disable-error', { error: error.message }, 'error');
      res.status(401).send({ error: 'TOTP disable error: user not found' });
      return;
    }

    try {
      const secret = await this.model('userTotpSecret')
        .findOne({ where: { userId } })
        .then((row) => row?.dataValues);

      if (!secret) {
        res.status(401).send({ error: 'TOTP secret not found.' });
        return;
      }

      // Make sure that the user has access to the existing secret
      const totp = new TOTP(secret.secret);
      if (!totp.validate(code)) {
        res.status(401).send({ error: 'Invalid OTP.' });
        return;
      }

      // Remove the secret from the database
      await this.model('userTotpSecret').destroy({ where: { userId } });

      // Update the user profile to disable TOTP
      await this.model('user').update({ useTwoFactorAuth: false, twoFactorType: undefined }, { where: { userId } });

      await this.audit(req, userId, 'totp disabled');
      await this.revokeOtherSessions(userId, { accessToken, refreshToken });

      this.log.save('totp-disable-success', { userId }, 'info');
      res.status(201).send({ success: true });
    } catch (error: any) {
      this.log.save('totp-disable-error', { error: error.message }, 'error');
      res.status(401).send({ error: 'TOTP disable error: unable to finish the process' });
    }
  }
}

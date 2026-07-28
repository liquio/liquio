import { matchedData, query } from 'express-validator';

import { TOTP } from '../lib/totp';
import { AuthMiddleware } from '../middleware/authenticate';
import { saveSession } from '../middleware/session';
import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

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
      [query('userId').exists().isString(), this.handleValidation.bind(this)],
      authMiddleware.basic(),
      this.generateTotp.bind(this),
    );

    // Enable TOTP secret.
    // Note: Should be called from Cabinet API.
    this.router.post('/totp/enable', authMiddleware.basic(), this.enableTotpSecret.bind(this));

    // Disable TOTP secret.
    // Note: Should be called from Cabinet API.
    this.router.post('/totp/disable', authMiddleware.basic(), this.disableTotpSecret.bind(this));
  }

  /**
   * A method to verify TOTP code for a user.
   */
  async verifyTotp(req: Request, res: Response): Promise<void> {
    const user = req.session?.authInfo;
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body;
    if (!code) {
      res.status(400).send({ error: 'Code should be defined.' });
      return;
    }

    try {
      const secret = await this.model('userTotpSecret')
        .findOne({ where: { userId: user.userId } })
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

      await saveSession(req, { ...req.session.passport?.user, totpChecked: true });

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
    const { userId } = matchedData<{ userId: string }>(req, { locations: ['query'] });
    if (!userId) {
      res.status(400).send({ error: '`userId` should be defined.' });
      return;
    }

    try {
      const existingSecret = await this.model('userTotpSecret')
        .findOne({ where: { userId } })
        .then((row) => row?.dataValues);
      if (existingSecret) {
        this.log.save('totp-generate-warning', { userId }, 'warn');
        res.status(400).send({ error: 'TOTP is already generated.' });
        return;
      }

      // Generate a new secret
      const secret = TOTP.createSecret();
      const totp = new TOTP(secret);

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
    const { userId, secret, code } = req.body;

    if (!userId) {
      res.status(400).send({ error: '`userId` should be defined.' });
      return;
    }
    if (!secret) {
      res.status(400).send({ error: '`secret` should be defined.' });
      return;
    }
    if (!code) {
      res.status(400).send({ error: '`code` should be defined.' });
      return;
    }

    const totp = new TOTP(secret);
    if (!totp.validate(code)) {
      res.status(401).send({ error: 'Invalid code.' });
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
        this.log.save('totp-enable-warning', { userId }, 'warn');
        res.status(400).send({ error: 'TOTP is already enabled.' });
        return;
      }

      // Create (or update) the secret in the database
      await this.model('userTotpSecret').upsert({ userId, secret });

      // Update the user profile to enable TOTP
      await this.model('user').update({ useTwoFactorAuth: true, twoFactorType: 'totp' }, { where: { userId } });

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
    const { userId, code } = req.body;

    if (!userId) {
      res.status(400).send({ error: '`userId` should be defined.' });
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

      this.log.save('totp-disable-success', { userId }, 'info');
      res.status(201).send({ success: true });
    } catch (error: any) {
      this.log.save('totp-disable-error', { error: error.message }, 'error');
      res.status(401).send({ error: 'TOTP disable error: unable to finish the process' });
    }
  }
}

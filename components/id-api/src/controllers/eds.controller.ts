import { body, matchedData } from 'express-validator';

import { publicError } from '../lib/http_error';
import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

/**
 * EDS controller.
 */
export class EdsController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'eds');
  }

  protected registerRoutes() {
    // Challenge token for EDS (Signer widget) and x509 key-file login; not tied to the `eds` strategy being enabled.
    if (this.config.auth_providers?.x509?.isEnabled || this.config.auth_providers?.eds?.isEnabled) {
      this.router.get('/authorise/eds/sign', this.getToken.bind(this));
    }
    this.router.post(
      '/authorise/eds/sign',
      [body('token').isString(), body('signature').isString(), this.handleValidation.bind(this)],
      this.checkSign.bind(this),
    );
    this.router.get('/authorise/eds/serverList', this.getServerList.bind(this));
  }

  /**
   * Obtain random token to sign.
   */
  async getToken(req: Request, res: Response): Promise<void> {
    try {
      const token = await this.service('eds').getRandomContentToSign();
      res.send({ token });
    } catch (error: any) {
      this.log.save('get-token-error', { error: error?.message, stack: error?.stack }, 'error');
      res.status(500).send({ error: publicError(error) });
    }
  }

  /**
   * Obtain EDS server list.
   */
  async getServerList(req: Request, res: Response): Promise<void> {
    // Get random token to sign.
    let list;
    try {
      list = await this.service('eds').getEdsServersListFromEdsService();
    } catch (err) {
      return this.responseError(res, err, 500);
    }

    // Response random token to sign.
    this.responseData(res, { list });
  }

  /**
   * Check sign.
   */
  async checkSign(req: Request, res: Response): Promise<void> {
    const { token, signature } = matchedData(req, { locations: ['body'] });

    // Check random content sign.
    let signer, issuer, serial, pem;
    try {
      const signatureInfo = await this.service('eds').checkRandomContentSign(token, signature);
      signer = signatureInfo.signer;
      issuer = signatureInfo.issuer;
      serial = signatureInfo.serial;
      pem = signatureInfo.pem;
    } catch (error: any) {
      this.log.save('check-sign-eds-error', { error: error?.message }, 'error');
      this.responseError(res, error, 400);
      return;
    }

    // Response cert data.
    this.responseData(res, { signer, issuer, serial, pem });
  }
}

import { body, matchedData } from 'express-validator';

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
    this.router.post(
      '/authorise/eds/sign',
      [body('token').isString(), body('signature').isString(), this.handleValidation.bind(this)],
      this.checkSign.bind(this),
    );
    this.router.get('/authorise/eds/serverList', this.getServerList.bind(this));
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

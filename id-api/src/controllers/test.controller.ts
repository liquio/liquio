import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

// Constants.
const MESSAGE_PONG = 'pong';
const FALSE_STRING = 'false';
const NOTIFY_SERVICE_NAME = 'notify';
const EDS_SERVICE_NAME = 'eds';

/**
 * Test controller.
 */
export class TestController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'test');
  }

  protected registerRoutes() {
    this.router.get('/test/ping', this.ping.bind(this));
    this.router.get('/test/ping_with_auth', this.auth.basic(), this.pingWithAuth.bind(this));
  }

  /**
   * Ping.
   */
  async ping(req: Request, res: Response): Promise<void> {
    const healthCheck = req.query.health_check;

    const processPid = process.pid;
    let responseData: any = {
      processPid,
      message: MESSAGE_PONG,
    };

    if (healthCheck) {
      let notifyResponse;
      try {
        notifyResponse = await this.service('pingRequest').sendPingRequest(NOTIFY_SERVICE_NAME);
      } catch (error: any) {
        this.log.save('notify-exception-error', { error: error?.message }, 'error');
      }
      const notifyWideCheck = notifyResponse?.wideCheckRes;
      responseData.correctNotifyConnection =
        (notifyResponse &&
          notifyResponse.isCorrectConnection &&
          notifyWideCheck &&
          notifyWideCheck.versionsEqual &&
          notifyWideCheck.customerEqual &&
          notifyWideCheck.environmentEqual) ||
        FALSE_STRING;
      if (notifyWideCheck?.meta) {
        responseData.notifyMeta = notifyWideCheck.meta;
      }

      let edsServicePingResponse;
      try {
        edsServicePingResponse = await this.service('pingRequest').sendPingRequest(EDS_SERVICE_NAME);
      } catch (error: any) {
        this.log.save('eds-service-exception-error', { error: error?.message }, 'error');
      }

      const edsWideCheck = edsServicePingResponse?.wideCheckRes;
      responseData.correctEdsConnection =
        (edsServicePingResponse &&
          edsServicePingResponse.isCorrectConnection &&
          edsWideCheck &&
          edsWideCheck.versionsEqual &&
          edsWideCheck.customerEqual &&
          edsWideCheck.environmentEqual) ||
        FALSE_STRING;
      if (edsWideCheck?.meta) {
        responseData.edsMeta = edsWideCheck.meta;
      }
    }

    this.responseData(res, responseData);
  }

  /**
   * Ping with auth.
   */
  async pingWithAuth(req: Request, res: Response): Promise<void> {
    const responseData = {
      processPid: process.pid,
      message: MESSAGE_PONG,
    };

    this.responseData(res, responseData);
  }
}

import { Controller } from './controller';

// Constants.
const MESSAGE_PONG = 'pong';

/**
 * Ping controller.
 */
export class PingController extends Controller {
  static singleton: PingController;

  /**
   * Ping controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    // Define singleton.
    if (!PingController.singleton) {
      super(config);
      PingController.singleton = this;
    }
    return PingController.singleton;
  }

  /**
   * Ping.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  ping(req: any, res: any) {
    // Prepare response data.
    const processPid = process.pid;
    const responseData = {
      processPid,
      message: MESSAGE_PONG,
    };

    // Response.
    this.responseData(res, responseData);
  }

  /**
   * Ping.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async healthz(req: any, res: any) {
    try {
      const { healthz = {} } = this.config.ping;
      if (healthz.db && healthz.db.enabled) {
        await this.checkDataBase();
      }

      this.responseData(res, { status: 'ok' });
    } catch (e: any) {
      this.responseError(res, { error: e.message });
    }
  }

  /**
   * Check database connect
   */
  async checkDataBase() {
    const result = await global.db.query('select true');
    return result;
  }
}

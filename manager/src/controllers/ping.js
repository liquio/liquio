const Controller = require('./controller');

// Constants.
const MESSAGE_PONG = 'pong';

/**
 * Ping controller.
 */
class PingController extends Controller {
  /**
   * Ping controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
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
  ping(req, res) {
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
  async healthz(req, res) {
    try {
      const { healthz = {} } = this.config.ping;
      if (healthz.db && healthz.db.enabled) {
        await this.checkDataBase();
      }

      this.responseData(res, { status: 'ok' });
    } catch (e) {
      this.responseError(res, { error: e.message });
    }
  }

  /**
   * Check database connect
   */
  async checkDataBase() {
    const result = await db.query('select true');
    return result;
  }
}

module.exports = PingController;

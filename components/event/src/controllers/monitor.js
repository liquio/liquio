const os = require('os');

const Controller = require('./controller');

/**
 * Monitor controller.
 */
class MonitorController extends Controller {
  /**
   * Monitor controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!MonitorController.singleton) {
      super(config);
      MonitorController.singleton = this;
    }
    return MonitorController.singleton;
  }

  /**
   * System.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  system(req, res) {
    // Prepare info.
    const systemInfo = {
      hostname: os.hostname(),
      osType: os.type(),
      osPlatform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptimeSec: os.uptime().toFixed(0),
      loadAvg: os.loadavg(),
      totalMemGb: (os.totalmem() / 1024 / 1024 / 1024).toFixed(3),
      freeMemGb: (os.freemem() / 1024 / 1024 / 1024).toFixed(3),
      cpus: os.cpus(),
    };

    // Response.
    this.responseData(res, systemInfo);
  }
}

module.exports = MonitorController;

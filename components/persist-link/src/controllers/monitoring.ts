// Import.
import os from 'os';

import Controller from './controller';

/**
 * Monitoring controller.
 */
class MonitoringController extends Controller {
  /**
   * Monitoring controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    super(config);

    // Define singleton.
    if (!MonitoringController.singleton) {
      MonitoringController.singleton = this;
    }
    return MonitoringController.singleton;
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

// Export.
export default MonitoringController;

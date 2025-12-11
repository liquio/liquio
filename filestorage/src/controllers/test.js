const Controller = require('./controller');
const Preview = require('../lib/preview');
const Openstack = require('../providers/openstack');

const MESSAGE_PONG = 'pong';
const DEFAULT_VERSION = '0.0.0';
const DEFAULT_CUSTOMER = 1;
const DEFAULT_ENVIRONMENT = 0;
const PWGEN_SERVICE_INFO = 'pwgen';

/**
 * Test controller.
 */
class TestController extends Controller {
  /**
   * Test controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!TestController.singleton) {
      super(config);
      this.preview = new Preview();
      this.providersConfig = config && config.providers;
      TestController.singleton = this;
    }
    return TestController.singleton;
  }

  /**
   * Ping.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async ping(req, res) {
    // Define params.
    const healthCheck = req.query.health_check;

    // Prepare response data.
    const processPid = process.pid;
    const responseData = {
      processPid,
      message: MESSAGE_PONG,
    };

    if (healthCheck) {
      // Define customer and environment.
      const customer = (this.config && this.config.server && this.config.server.customer) || DEFAULT_CUSTOMER;
      const environment = (this.config && this.config.server && this.config.server.environment) || DEFAULT_ENVIRONMENT;

      // Check preview generator service.
      let previewServiceResponse;
      try {
        previewServiceResponse = await this.preview.sendPingRequest();
      } catch (error) {
        log.save('test-ping-preview-service-error', { error: error && error.message });
      }
      const pwgenPongMsg = previewServiceResponse && previewServiceResponse.body && previewServiceResponse.body.message === MESSAGE_PONG;

      // Check version, customer and environment equality.
      const pwgenVersion = previewServiceResponse && previewServiceResponse.version;
      const pwgenCustomer = previewServiceResponse && previewServiceResponse.customer;
      const pwgenEnvironment = previewServiceResponse && previewServiceResponse.environment;
      const pwgenVersionsEquality = this.checkServiceVersion(PWGEN_SERVICE_INFO, pwgenVersion);
      const pwgenCustomerEquality = customer == pwgenCustomer;
      const pwgenEnvironmentEquality = environment == pwgenEnvironment;
      responseData.previewServiceResponse = pwgenPongMsg && pwgenVersionsEquality && pwgenCustomerEquality && pwgenEnvironmentEquality ? true : false;
      if (!pwgenVersionsEquality && pwgenPongMsg) {
        responseData.previewServiceMeta = { versionEqual: pwgenVersionsEquality };
      }
      if (!pwgenCustomerEquality && pwgenPongMsg) {
        responseData.previewServiceMeta = { ...responseData.previewServiceMeta, customerEqual: pwgenCustomerEquality };
      }
      if (!pwgenEnvironmentEquality && pwgenPongMsg) {
        responseData.previewServiceMeta = { ...responseData.previewServiceMeta, environmentEqual: pwgenEnvironmentEquality };
      }
    }

    // Response.
    this.responseData(res, responseData);
  }

  /**
   * @private
   * Check service version.
   * @param {string} serviceName Service name.
   * @param {string} serviceVersion Service version.
   */
  checkServiceVersion(serviceName, serviceVersion) {
    const serviceVersionInfo = this.config.versions && this.config.versions.services.find((v) => v.name === serviceName);
    const serviceMinVersion = (serviceVersionInfo && serviceVersionInfo.minVersion) || DEFAULT_VERSION;
    if (!serviceMinVersion || !serviceVersion) {
      log.save('can-not-find-service-min-version');
      return false;
    }

    const [versionMajor, versionMinor, versionPatch] = serviceVersion.split('.').map((v) => parseInt(v));
    const [minVersionMajor, minVersionMinor, minVersionPatch] = serviceMinVersion.split('.').map((v) => parseInt(v));

    if (versionMajor > minVersionMajor) {
      return true;
    }
    if (versionMajor < minVersionMajor) {
      return false;
    }

    if (versionMinor > minVersionMinor) {
      return true;
    }
    if (versionMinor < minVersionMinor) {
      return false;
    }

    if (versionPatch > minVersionPatch) {
      return true;
    }
    if (versionPatch < minVersionPatch) {
      return false;
    }

    return true;
  }

  /**
   * Check file provider.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async checkOpenstackProvider(req, res) {
    const { query } = req;
    const { count_object: countObject } = query;
    const { openstack: openstackConfig } = (this.providersConfig && this.providersConfig.list) || {};
    const containerName = openstackConfig && openstackConfig.container;
    const openstack = new Openstack(openstackConfig);
    let response;
    try {
      response = await openstack.getMetadata(containerName, countObject);
    } catch (error) {
      log.save('check-openstack-metadata-error', { error });
      return this.responseError(res, `get-openstack-metadata-error: ${error && error.message}`);
    }

    // Return response.
    this.responseData(res, { ...response });
  }

  /**
   * Get dependency metrics for Prometheus.
   * @returns {{name, checkFunction}}
   */
  getDependencyMetricsForPrometheus() {
    return [];
  }
}

// Export.
module.exports = TestController;

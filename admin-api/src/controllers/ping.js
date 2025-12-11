const Controller = require('./controller');

const Auth = require('../services/auth');
const RegisterService = require('../services/register');
const TaskService = require('../services/task');
const NotifyService = require('../services/notifier');

// Constants.
const MESSAGE_PONG = 'pong';
const AUTH_SERVICE_NAME = 'id';
const REGISTER_SERVICE_NAME = 'register';
const TASK_SERVICE_NAME = 'task';
const NOTIFY_SERVICE_NAME = 'notify';
const DEFAULT_VERSION = '0.0.0';
const DEFAULT_CUSTOMER = '1';
const DEFAULT_ENVIRONMENT = '0';

/**
 * Ping controller.
 */
class PingController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!PingController.singleton) {
      super(config);
      this.auth = new Auth(config.auth);
      this.registerService = new RegisterService();
      this.taskService = new TaskService();
      this.notifyService = new NotifyService();
      PingController.singleton = this;
    }
    return PingController.singleton;
  }

  /**
   * Ping.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async ping(req, res) {
    // Define query params.
    const healthCheck = req.query.health_check;

    // Prepare response data.
    const processPid = process.pid;
    const responseData = {
      processPid,
      message: MESSAGE_PONG,
    };

    if (healthCheck) {
      // Check auth service.
      let authServiceResponse;
      try {
        authServiceResponse = await this.auth.sendPingRequest();
      } catch (error) {
        log.save('test-ping-auth-service-error', { error: error && error.message });
      }
      const authPongMessage = authServiceResponse && authServiceResponse.body && authServiceResponse.body.message === MESSAGE_PONG ? true : false;
      const authWideCheckRes = this.wideCheck(authServiceResponse, AUTH_SERVICE_NAME, authPongMessage);
      responseData.authServiceResponse =
        authPongMessage && authWideCheckRes.versionsEqual && authWideCheckRes.customerEqual && authWideCheckRes.environmentEqual ? true : false;
      if (authWideCheckRes.meta) {
        responseData.authServiceMeta = authWideCheckRes.meta;
      }

      // Check register service.
      let registerServiceResponse;
      try {
        registerServiceResponse = await this.registerService.sendPingRequest();
      } catch (error) {
        log.save('test-ping-register-service-error', { error: error && error.message });
      }
      const registerPongMessage =
        registerServiceResponse &&
        registerServiceResponse.body &&
        registerServiceResponse.body.data &&
        registerServiceResponse.body.data.message === MESSAGE_PONG
          ? true
          : false;
      const registerWideCheckRes = this.wideCheck(registerServiceResponse, REGISTER_SERVICE_NAME, registerPongMessage);
      responseData.registerServiceResponse =
        registerPongMessage && registerWideCheckRes.versionsEqual && registerWideCheckRes.customerEqual && registerWideCheckRes.environmentEqual
          ? true
          : false;
      if (registerWideCheckRes.meta) {
        responseData.registerServiceMeta = registerWideCheckRes.meta;
      }

      // Check task service.
      let taskServiceResponse;
      try {
        taskServiceResponse = await this.taskService.sendPingRequest();
      } catch (error) {
        log.save('test-ping-bpmn-task-service-error', { error: error && error.message });
      }
      const taskPongMessage =
        taskServiceResponse && taskServiceResponse.body && taskServiceResponse.body.data && taskServiceResponse.body.data.message === MESSAGE_PONG
          ? true
          : false;
      const taskWideCheckRes = this.wideCheck(taskServiceResponse, TASK_SERVICE_NAME, taskPongMessage);
      responseData.taskServiceResponse =
        taskPongMessage && taskWideCheckRes.versionsEqual && taskWideCheckRes.customerEqual && taskWideCheckRes.environmentEqual ? true : false;
      if (taskWideCheckRes.meta) {
        responseData.taskServiceMeta = taskWideCheckRes.meta;
      }

      // Check notify service.
      let notifyServiceResponse;
      try {
        notifyServiceResponse = await this.notifyService.sendPingRequest();
      } catch (error) {
        log.save('test-ping-notify-service-error', { error: error && error.message });
      }
      const notifierPongMessage =
        notifyServiceResponse && notifyServiceResponse.body && notifyServiceResponse.body.message === MESSAGE_PONG ? true : false;
      const notifyWideCheckRes = this.wideCheck(notifyServiceResponse, NOTIFY_SERVICE_NAME, notifierPongMessage);
      responseData.notifyServiceResponse =
        notifierPongMessage && notifyWideCheckRes.versionsEqual && notifyWideCheckRes.customerEqual && notifyWideCheckRes.environmentEqual
          ? true
          : false;
      if (notifyWideCheckRes.meta) {
        responseData.notifyServiceMeta = notifyWideCheckRes.meta;
      }
    }
    // Response.
    this.responseData(res, responseData);
  }

  /**
   * Ping services.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingServices(req, res) {
    let responseData;
    try {
      responseData = await this.taskService.pingServices();
    } catch (error) {
      log.save('test-ping-services-error', { error: error && error.message });
    }

    this.responseData(res, responseData, true);
  }

  /**
   * @private
   * Check service version.
   * @param {string} serviceName Service name.
   * @param {string} serviceVersion Service version.
   */
  checkServiceVersion(serviceName, serviceVersion) {
    const serviceVersionInfo = config.versions && config.versions.services.find((v) => v.name === serviceName);
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
   * @private
   * Check customer.
   * @param {string} partnerServiceCustomer Partner service customer.
   */
  checkCustomer(partnerServiceCustomer) {
    const curentServiceCustomer = (this.config.server && this.config.server.customer) || DEFAULT_CUSTOMER;
    if (!partnerServiceCustomer || !curentServiceCustomer) {
      log.save('ping-can-not-check-services-customer');
      return false;
    }
    return curentServiceCustomer === partnerServiceCustomer;
  }

  /**
   * @private
   * Check environment.
   * @param {string} partnerServiceEnvironment Partner service environment.
   */
  checkEnvironment(partnerServiceEnvironment) {
    const curentServiceEnvironment = (this.config.server && this.config.server.environment) || DEFAULT_ENVIRONMENT;
    if (!partnerServiceEnvironment || !curentServiceEnvironment) {
      log.save('ping-can-not-check-services-environment');
      return false;
    }
    return curentServiceEnvironment === partnerServiceEnvironment;
  }

  /**
   * @private
   * Wide check services.
   * @param {object} serviceRepsonse Service response.
   * @param {string} serviceName Service name.
   * @param {string} serviceMessage Service message.
   */
  wideCheck(serviceResponse, serviceName, serviceMessage) {
    const version = serviceResponse && serviceResponse.version;
    const customer = serviceResponse && serviceResponse.customer;
    const environment = serviceResponse && serviceResponse.environment;
    const versionsEqual = this.checkServiceVersion(serviceName, version);
    const customerEqual = this.checkCustomer(customer);
    const environmentEqual = this.checkEnvironment(environment);

    let meta;
    if (!versionsEqual && serviceMessage) {
      meta = { versionsEqual };
    }
    if (!customerEqual && serviceMessage) {
      meta = { ...meta, customerEqual };
    }
    if (!environmentEqual && serviceMessage) {
      meta = { ...meta, environmentEqual };
    }

    return { versionsEqual, customerEqual, environmentEqual, meta };
  }
}

module.exports = PingController;

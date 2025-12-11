const Controller = require('./controller');
const Auth = require('../services/auth');
const NotifierService = require('../services/notifier');
const RegisterService = require('../services/register');
const Eds = require('../lib/eds');
const AppInfo = require('../lib/app_info');
const FileStorage = require('../lib/filestorage');
const HttpRequest = require('../lib/http_request');
const PaymentService = require('../services/payment');

// Constants.
const MESSAGE_PONG = 'pong';
const AUTH_SERVICE_NAME = 'id';
const NOTIFY_SERVICE_NAME = 'notify';
const REGISTER_SERVICE_NAME = 'register';
const EDS_SERVICE_NAME = 'eds';
const FILESTORAGE_SERVICE_NAME = 'filestorage';
const MANAGER_SERVICE_NAME = 'manager';
const DEFAULT_VERSION = '0.0.0';
const DEFAULT_CUSTOMER = '1';
const DEFAULT_ENVIRONMENT = '0';

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
      this.auth = new Auth().provider;
      this.eds = new Eds(config.eds);
      this.notifierService = new NotifierService();
      this.registerService = new RegisterService();
      this.fileStorage = new FileStorage(config.fileStorage);
      this.PaymentService = new PaymentService(config.payment);
      PingController.singleton = this;
    }
    return PingController.singleton;
  }

  /**
   * Ping.
   * @param {query} query HTTP query.
   */
  async ping({ query }) {
    const { health_check: healthCheck, payment, sign } = query || {};
    return this.selfPing(healthCheck, payment, sign);
  }

  /**
   * Ping services.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingServices(req, res) {
    const cfg = config.ping || {};

    let responseData = {};

    let promises = [];

    promises.push(this.selfPing(true));

    for (let key of Object.keys(cfg)) {
      // Skip if explicitly disabled or no URL.
      if (cfg[key]?.active === false || !cfg[key]?.url) {
        continue;
      }

      promises.push(
        this.sendPingRequest(cfg[key].url)
          .then((data) => ({ [key]: { data } }))
          .catch((error) => ({ [key]: { error } })),
      );
    }

    let taskResponse, results;
    try {
      [taskResponse, ...results] = await Promise.all(promises);
    } catch (error) {
      log.save('test-ping-services-error|ping-services', { error: error && error.message, stack: error.stack }, 'error');
    }

    const appInfo = new AppInfo();

    responseData.taskResponse = {
      name: appInfo.name,
      version: appInfo.version,
      ...taskResponse,
    };

    const responseMap = {
      id: 'idResponse',
      event: 'eventResponse',
      manager: 'managerResponse',
      gateway: 'gatewayResponse',
      workflow: 'workflowResponse',
      register: 'registerResponse',
      filestorage: 'filestorageResponse',
      externalReader: 'externalReaderResponse',
      notification: 'notifyResponse',
      signTool: 'signToolResponse',
      front: 'frontResponse',
      frontAdmin: 'frontAdminResponse',
      payment: 'paymentResponse',
    };

    for (let result of results) {
      const key = Object.keys(result)[0];
      const mapKey = responseMap[key] || key;
      responseData[mapKey] = result[key].data || result[key].error;
    }

    this.responseData(res, responseData);
  }

  /**
   * Ping services.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingCommittedDocumentsCount(req, res) {
    // Define params.
    const { document_template_id: documentTemplateId } = req.params;
    const { workflow_template_id: workflowTemplateId, type } = req.query;

    // Available document templates to ping count.
    const { committedDocumentsTemplateIdsToHoursMap } = config.ping_documents;
    const hours = committedDocumentsTemplateIdsToHoursMap[documentTemplateId];
    if (!hours) {
      log.save('ping-committed-document-not-available', { documentTemplateId, committedDocumentsTemplateIdsToHoursMap });
      return this.responseText(res, 'not-available', 400);
    }

    // Define updated from filter.
    const hoursInMilliseconds = hours * 3600 * 1000;
    const now = new Date();
    const updatedAtFrom = new Date(+now - hoursInMilliseconds);

    // Check is exists.
    try {
      if (workflowTemplateId && type === 'event') {
        const workflowIds = await models.workflow.getIdsByTemplateId(workflowTemplateId);
        const isExists = await models.event.checkExistDocumentsByWorkflowIds(workflowIds, true, updatedAtFrom);

        // Response result.
        return this.responseText(res, isExists);
      }

      if (documentTemplateId) {
        const isExists = await models.document.checkExists(documentTemplateId, true, updatedAtFrom);

        // Response result.
        return this.responseText(res, isExists);
      }
    } catch (error) {
      log.save('test-ping-services-error|ping-committed-documents-count', { error: error && error.message }, 'error');
      return this.responseError(res, error && error.message);
    }
  }

  /**
   * Send ping request.
   * @private
   * @param {string} url URL.
   * @returns {Promise<{object}>}
   */
  async sendPingRequest(url) {
    try {
      let { response, body } = await HttpRequest.send(
        {
          url: url,
          method: HttpRequest.Methods.GET,
          headers: {
            'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
            token: this.token,
          },
          timeout: 10000,
        },
        true,
      );

      const preparedData = this.prepareResponse({ response, body });

      return preparedData;
    } catch (error) {
      log.save('test-ping-services-error', { error: error && error.message, url }, 'error');
      return false;
    }
  }

  /**
   * Self ping.
   * @private
   * @param {boolean} healthCheck Health check indicator.
   * @param {boolean} payment Payment indicator.
   * @param {boolean} sign Sign indicator.
   * @returns {object}
   */
  async selfPing(healthCheck = false, _payment = false, sign = false) {
    // Prepare response data.
    const processPid = process.pid;
    const responseData = {
      processPid,
      message: MESSAGE_PONG,
    };

    // Additional healthchecks.
    if (healthCheck) {
      // Check auth service.
      let authServiceResponse;
      try {
        authServiceResponse = await this.auth.sendPingRequest();
      } catch (error) {
        log.save('test-ping-auth-service-error', { error: error && error.message }, 'warn');
      }
      const authPongMsg = authServiceResponse && authServiceResponse.body && authServiceResponse.body.message === MESSAGE_PONG;
      const authWideCheckRes = this.wideCheck(authServiceResponse, AUTH_SERVICE_NAME, authPongMsg);
      responseData.authResponse =
        authPongMsg && authWideCheckRes.versionsEqual && authWideCheckRes.customerEqual && authWideCheckRes.environmentEqual ? true : false;
      if (authWideCheckRes.meta) {
        responseData.authMeta = authWideCheckRes.meta;
      }

      // Check notify service.
      let notifyServiceResponse;
      try {
        notifyServiceResponse = await this.notifierService.sendPingRequest();
      } catch (error) {
        log.save('test-ping-notifier-service-error', { error: error && error.message }, 'warn');
      }
      const notifyPongMsg = notifyServiceResponse && notifyServiceResponse.body && notifyServiceResponse.body.message === MESSAGE_PONG;
      const notifyWideCheckRes = this.wideCheck(notifyServiceResponse, NOTIFY_SERVICE_NAME, notifyPongMsg);
      responseData.notifyResponse =
        notifyPongMsg && notifyWideCheckRes.versionsEqual && notifyWideCheckRes.customerEqual && notifyWideCheckRes.environmentEqual ? true : false;
      if (notifyWideCheckRes.meta) {
        responseData.notifyMeta = notifyWideCheckRes.meta;
      }

      // Check EDS service.
      let edsServiceResponse;
      try {
        edsServiceResponse = await this.eds.sendPingRequest();
      } catch (error) {
        log.save('test-ping-eds-service-error', { error: error && error.message }, 'warn');
      }
      const edsPongMsg =
        edsServiceResponse && edsServiceResponse.body && edsServiceResponse.body.data && edsServiceResponse.body.data.message === MESSAGE_PONG;
      const edsWideCheckRes = this.wideCheck(edsServiceResponse, EDS_SERVICE_NAME, edsPongMsg);
      responseData.edsServiceResponse =
        notifyPongMsg && edsWideCheckRes.versionsEqual && edsWideCheckRes.customerEqual && edsWideCheckRes.environmentEqual ? true : false;
      if (edsWideCheckRes.meta) {
        responseData.edsMeta = edsWideCheckRes.meta;
      }

      // Check register service.
      let registerServiceResponse;
      try {
        registerServiceResponse = await this.registerService.sendPingRequest();
      } catch (error) {
        log.save('test-ping-register-service-error', { error: error && error.message }, 'warn');
      }
      const registerPongMsg =
        registerServiceResponse &&
        registerServiceResponse.body &&
        registerServiceResponse.body.data &&
        registerServiceResponse.body.data.message === MESSAGE_PONG;
      const registerWideCheckRes = this.wideCheck(registerServiceResponse, REGISTER_SERVICE_NAME, registerPongMsg);
      responseData.registerServiceResponse =
        registerPongMsg && registerWideCheckRes.versionsEqual && registerWideCheckRes.customerEqual && registerWideCheckRes.environmentEqual
          ? true
          : false;
      if (registerWideCheckRes.meta) {
        responseData.registerMeta = registerWideCheckRes.meta;
      }

      // Check filestorage.
      let fileStorageServiceResponse;
      try {
        fileStorageServiceResponse = await this.fileStorage.sendPingRequest();
      } catch (error) {
        log.save('test-ping-filestorage-service-error', { error: error && error.message }, 'warn');
      }
      const filestoragePongMsg =
        fileStorageServiceResponse &&
        fileStorageServiceResponse.body &&
        fileStorageServiceResponse.body.data &&
        fileStorageServiceResponse.body.data.message === MESSAGE_PONG;
      const filestorageWideCheckRes = this.wideCheck(fileStorageServiceResponse, FILESTORAGE_SERVICE_NAME, filestoragePongMsg);
      responseData.fileStorageServiceResponse =
        filestoragePongMsg &&
        filestorageWideCheckRes.versionsEqual &&
        filestorageWideCheckRes.customerEqual &&
        filestorageWideCheckRes.environmentEqual
          ? true
          : false;
      if (filestorageWideCheckRes.meta) {
        responseData.filestorageMeta = filestorageWideCheckRes.meta;
      }

      // Check manager.
      let managerServiceResponse;
      try {
        managerServiceResponse = await this.sendPingRequest(config.ping.manager.active === false ? undefined : config.ping.manager.url);
      } catch (error) {
        log.save('test-ping-manager-service-error', { error: error && error.message }, 'warn');
      }
      const managerPongMsg = managerServiceResponse && managerServiceResponse.message === MESSAGE_PONG;
      const managerWideCheckRes = this.wideCheck(managerServiceResponse, MANAGER_SERVICE_NAME, managerPongMsg);
      responseData.managerServiceResponse =
        managerPongMsg && managerWideCheckRes.versionsEqual && managerWideCheckRes.customerEqual && managerWideCheckRes.environmentEqual
          ? true
          : false;
      if (managerWideCheckRes.meta) {
        responseData.managerMeta = managerWideCheckRes.meta;
      }
    }

    // Check sign if need it.
    if (sign) {
      // Get test sign params.
      const { signature } = global.config.ping_sign;

      // Try to verify sign.
      try {
        const signatureInfo = await this.eds.getSignatureInfo(signature);
        const { signer, issuer, serial, signTime } = signatureInfo;
        responseData.sign = true;
        responseData.signDetails = { signer, issuer, serial, signTime };
      } catch (error) {
        responseData.sign = false;
        responseData.signDetails = (error && error.message) || error;
      }
    }

    return responseData;
  }

  /**
   * Prepare response.
   * @private
   * @param {object} data Data.
   * @param {object} data.response Response.
   * @param {object} data.body Body.
   * @returns {object}
   */
  prepareResponse({ response, body }) {
    let preparedResponse = {};

    if (body.data) {
      preparedResponse = {
        name: response.headers.name,
        version: response.headers.version,
        customer: response.headers.customer,
        environment: response.headers.environment,
        ...body.data,
      };
    } else {
      preparedResponse = {
        name: response.headers.name,
        version: response.headers.version,
        customer: response.headers.customer,
        environment: response.headers.environment,
        ...body,
      };
    }

    return preparedResponse;
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
    const curentServiceCustomer = (config.server && config.server.customer) || DEFAULT_CUSTOMER;
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
    const curentServiceEnvironment = (config.server && config.server.environment) || DEFAULT_ENVIRONMENT;
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

  /**
   * healthz.
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

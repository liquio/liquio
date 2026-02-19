const Controller = require('./controller');
const Notifier = require('../services/event/notifier');
const Register = require('../services/event/requester/registers');
const BlockchainRequester = require('../services/event/requester/blockchain');
const PersistLink = require('../lib/persist_link');
const Filestorage = require('../lib/filestorage');
const ServicesRepository = require('../services/event/requester/services_repository');
const ExternalService = require('../services/event/requester/external_service');
const HttpRequest = require('../lib/http_request');

// Constants.
const MESSAGE_PONG = 'pong';
const BLOCKCHAIN_EMPTY_BODY_MESSAGE = 'argument';
const TRUE_STRING = 'true';
const SMS_NOTIFY_SERVICE_NAME = 'notify';
const EMAIL_NOTIFY_SERICE_NAME = 'notify';
const REGISTER_SERVICE_NAME = 'register';
const PLINK_SERVICE_NAME = 'plink';
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
      this.notifier = new Notifier(config.notifier);
      this.register = new Register(config.registers);
      this.blockchainRequester = new BlockchainRequester(config.blockchain);
      this.persistLink = new PersistLink(config.persist_link);
      this.filestorage = new Filestorage();
      this.servicesRepository = new ServicesRepository(config.requester && config.requester.servicesRepository);
      this.externalService = new ExternalService(config.requester && config.requester.externalService);
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
    // Define params.
    const healthCheck = req.query.health_check;

    // Prepare response data.
    const processPid = process.pid;
    const responseData = {
      processPid,
      message: MESSAGE_PONG,
    };

    if (healthCheck) {
      // Check sms notifier.
      let smsNotifierResponse;
      try {
        smsNotifierResponse = await this.notifier.smsNotifier.sendPingRequest();
      } catch (error) {
        log.save('test-ping-sms-notifier-service-error', { error: error && error.message });
      }
      const smsNotifyPongMsg = smsNotifierResponse && smsNotifierResponse.body && smsNotifierResponse.body.message === MESSAGE_PONG;
      const smsNotifyWideCheck = this.wideCheck(smsNotifierResponse, SMS_NOTIFY_SERVICE_NAME, smsNotifyPongMsg);
      responseData.smsNotifierResponse =
        smsNotifyPongMsg &&
        smsNotifyWideCheck &&
        smsNotifyWideCheck.versionsEqual &&
        smsNotifyWideCheck.customerEqual &&
        smsNotifyWideCheck.environmentEqual
          ? true
          : false;
      if (smsNotifyWideCheck.meta) responseData.smsNotifierMeta = smsNotifyWideCheck.meta;

      // Check email notifier.
      let emailNotifierResponse;
      try {
        emailNotifierResponse = await this.notifier.emailNotifier.sendPingRequest();
      } catch (error) {
        log.save('test-ping-email-notifier-service-error', { error: error && error.message });
      }
      const emailNotifyPongMsg = emailNotifierResponse && emailNotifierResponse.body && emailNotifierResponse.body.message === MESSAGE_PONG;
      const emailNotifyWideCheck = this.wideCheck(emailNotifierResponse, EMAIL_NOTIFY_SERICE_NAME, emailNotifyPongMsg);
      responseData.emailNotifierResponse =
        emailNotifyPongMsg &&
        emailNotifyWideCheck &&
        emailNotifyWideCheck.versionsEqual &&
        emailNotifyWideCheck.customerEqual &&
        emailNotifyWideCheck.environmentEqual
          ? true
          : false;
      if (emailNotifyWideCheck.meta) responseData.emailNotifierMeta = emailNotifyWideCheck.meta;

      // Check register.
      let registerResponse;
      try {
        registerResponse = await this.register.sendPingRequest();
      } catch (error) {
        log.save('test-ping-register-service-error', { error: error && error.message });
      }
      const registerPongMsg =
        registerResponse && registerResponse.body && registerResponse.body.data && registerResponse.body.data.message === MESSAGE_PONG;
      const registerWideCheck = this.wideCheck(registerResponse, REGISTER_SERVICE_NAME, registerPongMsg);
      responseData.registerResponse =
        registerPongMsg &&
        registerWideCheck &&
        registerWideCheck.versionsEqual &&
        registerWideCheck.customerEqual &&
        registerWideCheck.environmentEqual
          ? true
          : false;
      if (registerWideCheck.meta) responseData.registerMeta = registerWideCheck.meta;

      // Check persist link.
      let pLinkResponse;
      try {
        pLinkResponse = await this.persistLink.sendPingRequest();
      } catch (error) {
        log.save('test-ping-persist-link-service-error', { error: error && error.message });
      }
      const pLinkPongMsg = pLinkResponse && pLinkResponse.body && pLinkResponse.body.message === MESSAGE_PONG;
      const pLinkWideCheck = this.wideCheck(pLinkResponse, PLINK_SERVICE_NAME, pLinkPongMsg);
      responseData.pLinkResponse =
        pLinkPongMsg && pLinkWideCheck && pLinkWideCheck.versionsEqual && pLinkWideCheck.customerEqual && pLinkWideCheck.environmentEqual
          ? true
          : false;
      if (pLinkWideCheck.meta) responseData.pLinkMeta = pLinkWideCheck.meta;

      // Check filestorage.
      let fileStorageServiceResponse;
      try {
        fileStorageServiceResponse = await this.filestorage.sendPingRequest();
      } catch (error) {
        log.save('test-ping-filestorage-service-error', { error: error && error.message });
      }
      const filestoragePongMsg =
        fileStorageServiceResponse && fileStorageServiceResponse.body && fileStorageServiceResponse.body.message === MESSAGE_PONG;
      const filestorageWideCheck = this.wideCheck(fileStorageServiceResponse, FILESTORAGE_SERVICE_NAME, filestoragePongMsg);
      responseData.filestorageResponse =
        filestoragePongMsg &&
        filestorageWideCheck &&
        filestorageWideCheck.versionsEqual &&
        filestorageWideCheck.customerEqual &&
        filestorageWideCheck.environmentEqual
          ? true
          : false;
      if (filestorageWideCheck.meta) responseData.filestorageMeta = filestorageWideCheck.meta;

      // Check manager.
      let managerServiceResponse;
      try {
        managerServiceResponse = await this.sendPingRequest(config.ping.manager.url);
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

      // Check blockchain.
      const blockchain = req.query.blockchain || 'false';
      if (blockchain === TRUE_STRING) {
        let blockchainResponse;
        try {
          blockchainResponse = await this.blockchainRequester.register();
        } catch (error) {
          log.save('test-ping-blockchain-service-error', { error: error && error.message });
        }
        responseData.blockchainResponse = blockchainResponse?.message?.includes(BLOCKCHAIN_EMPTY_BODY_MESSAGE) ? true : false;
      }

      // Check trembita.
      const checkTrembita = req.query.trembita || false;
      if (checkTrembita && config.ping.trembita) {
        let trembitaResponse;
        try {
          trembitaResponse = await this.sendPingRequest(config.ping.trembita.url, false);
        } catch (error) {
          log.save('test-ping-trembita-service-error', { error: error && error.message });
        }
        responseData.trembitaResponse = !!(trembitaResponse?.body?.length > 100);
      }

      // Check digest notifier.
      const checkMailerlite = req.query.mailerlite || false;
      if (checkMailerlite) {
        let digestNotifierResponse;
        try {
          digestNotifierResponse = await this.notifier.digestNotifier.sendPingRequest();
        } catch (error) {
          log.save('test-ping-digest-notifier-service-error', { error: error && error.message });
        }
        responseData.digestNotifierResponse = digestNotifierResponse && digestNotifierResponse.bounce_rate ? true : false;
      }

      const servicesRepository = req.query.repository || false;
      if (servicesRepository) {
        let statusesRepositoryResponse;
        try {
          statusesRepositoryResponse = await this.servicesRepository.sendPingRequest();
        } catch (error) {
          log.save('test-ping-statuses-repository-service-error', { error: error && error.message });
        }
        responseData.repositoryResponse =
          statusesRepositoryResponse &&
          statusesRepositoryResponse.status &&
          statusesRepositoryResponse.status.status === 'up' &&
          statusesRepositoryResponse.status.db === 'up'
            ? true
            : false;
      }
    }

    // Response.
    this.responseData(res, responseData);
  }

  /**
   * Ping Trembita.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingTrembita(req, res) {
    // Check trembita.
    let trembitaResponse;
    try {
      trembitaResponse = await this.externalService.send({ providerName: 'trembita', documents: [], events: [], documentTemplateId: 'listMethods' });
    } catch (error) {
      log.save('test-ping-trembita-service-error', { error: error && error.message });
    }
    const responseText = trembitaResponse && trembitaResponse.sendingResult && trembitaResponse.sendingResult.isDone ? 'true' : 'false';

    // Response.
    this.responseText(res, responseText);
  }

  /**
   * Ping Status Repository.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingStatusRepository(req, res) {
    let statusesRepositoryResponse;
    try {
      statusesRepositoryResponse = await this.servicesRepository.sendPingRequest();
    } catch (error) {
      log.save('test-ping-statuses-repository-service-error', { error: error && error.message });
    }
    const responseText =
      statusesRepositoryResponse &&
      statusesRepositoryResponse.status &&
      statusesRepositoryResponse.status.status === 'up' &&
      statusesRepositoryResponse.status.db === 'up'
        ? 'true'
        : 'false';

    // Response.
    this.responseText(res, responseText);
  }

  /**
   * Ping Trembita.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingDigestNotifier(req, res) {
    let digestNotifierResponse;
    try {
      digestNotifierResponse = await this.notifier.digestNotifier.sendPingRequest();
    } catch (error) {
      log.save('test-ping-digest-notifier-service-error', { error: error && error.message });
    }
    const responseText = digestNotifierResponse && digestNotifierResponse.bounce_rate ? 'true' : 'false';

    // Response.
    this.responseText(res, responseText);
  }

  /**
   * Ping Minjust.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingMinjust(req, res) {
    const dataToSend = {
      external_reader_edr_record: [],
      id: 'reest_physical',
      collalias: 'reest_physical',
      is_edr_available: true,
      is_user_active_fop_calculated: false,
      reason_of_rejection: 'Інша причина',
      reest_physical_zip: '01254',
      reest_physical_corps: '',
      date_for_visit_year_available: '2020',
      is_reest_physical_vat_doc: false,
      reest_physical_building_n: '4',
      date_for_visit_month_available: '07',
      reest_physical_number_unit: '',
      reest_physical_kved: ['98.20 Діяльність домашніх господарств як виробників послуг для власного споживання'],
      id_card_number: '123456789',
      nationality: '30581756',
      value: 'c0413b10-cd7c-11e9-a574-654b30581756',
      code: '804',
      nameEng: 'Ukraine',
      nameLong: 'УКРАЇНА',
      nameShort: 'Україна',
      stringified: 'Україна',
      label: 'Україна',
      address: '1',
      _a_t_u: { propertiesHasOptions: { region: true, district: false, city: false } },
      income_ammount: 0,
      is_user_closed_fop_this_year: false,
      system: '3',
      date_of_visit: null,
      is_pdv: null,
      date_of_transition_simplified_form_taxation: '28.05.2020 р.',
      workflow_id: 'f8621250-a0ab-11ea-bb62-016aed8c8028',
      document_id: 'f88be170-a0ab-11ea-bb62-016aed8c8028',
    };

    // Check minjust.
    let minjustResponse;
    const isTestResponse = true;
    try {
      minjustResponse = await this.minjustProvider.send(dataToSend, isTestResponse);
    } catch (error) {
      log.save('test-ping-minjust-service-error', { error: error && error.message });
    }

    const responseText =
      minjustResponse && minjustResponse.reest_physical_main_doc_ecp && minjustResponse.reest_physical_main_doc_ecp.isEmpty ? 'true' : 'false';
    this.responseText(res, responseText);
  }

  /**
   * Ping MinjustUsr.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingMinjustUsr(req, res) {
    const dataToSend = {
      code: 262520496045,
    };

    // Check minjust.
    let minjustUsrResponse;
    const isTestResponse = true;
    try {
      minjustUsrResponse = await this.minjustUsrProvider.send(dataToSend, isTestResponse);
    } catch (error) {
      log.save('test-ping-minjust-service-error', { error: error && error.message });
    }

    const responseText = minjustUsrResponse ? 'true' : 'false';
    this.responseText(res, responseText);
  }

  /**
   * Ping MinjustUsr.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async pingMinjustDoc(req, res) {
    // Check minjust.
    let minjustUsrResponse;
    try {
      minjustUsrResponse = await this.minjustDocProvider.download({ code: '() => 262520496045', isTest: true });
    } catch (error) {
      log.save('test-ping-minjust-service-error', { error: error && error.message });
    }

    const responseText = minjustUsrResponse ? 'true' : 'false';
    this.responseText(res, responseText);
  }

  /**
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
   * Send ping request.
   * @private
   * @param {string} url URL.
   * @param {boolean} [withHeaders] With headers indicator.
   * @returns {Promise<{object}>}
   */
  async sendPingRequest(url, withHeaders = true) {
    try {
      let requestParams = {
        url: url,
        method: HttpRequest.Methods.GET,
      };
      if (withHeaders) {
        requestParams.headers = {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          token: this.token,
        };
      }
      let { fullResponse: response, body } = await HttpRequest.send(requestParams, true);

      const preparedData = this.prepareResponse({ response, body });

      return preparedData;
    } catch (error) {
      log.save('test-ping-services-error', { error: error && error.message }, 'error');
    }
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
    let preparedResponse;

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

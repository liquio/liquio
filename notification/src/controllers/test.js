// Imports.
const { checkAuth } = require('./auth');
const Router = require('restify-router').Router;
const axios = require('axios');
const conf = require('../config/config');

const routerInstance = new Router();

// Constants.
const MESSAGE_PONG = 'pong';
const FALSE_STRING = 'false';
const AUTH_SERVICE_NAME = 'id';
const PERSIST_LINK_SERVICE_NAME = 'plink';
const PERSIST_LINK_PING_URL = 'https://persist-link-test-court-services/test/ping';
const AUTH_SERVICE_PING_URL = 'http://id.test.court-services/test/ping';
const DEFAULT_VERSION = '0.0.0';
const DEFAULT_CUSTOMER = '1';
const DEFAULT_ENVIRONMENT = '0';

/**
 * Test controller constructor.
 * @param {object} server Server instance.
 */
const TestController = class {
  constructor(server) {
    this.registerRoutes();
    return routerInstance.applyRoutes(server);
  }

  /**
   * Register routes.
   */
  registerRoutes() {
    // Add routes.
    routerInstance.get('/test/ping', this.ping.bind(this));
    routerInstance.get('/test/ping_with_auth', checkAuth, this.ping.bind(this));
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
      let authServicePingResponse;
      let authServicePingResponseError;
      try {
        authServicePingResponse = await this.sendPingRequest(AUTH_SERVICE_NAME);
      } catch (error) {
        console.log(error && error.message);
        authServicePingResponseError = error && error.message;
      }
      responseData.correctAuthServiceConnection =
        (authServicePingResponse &&
          authServicePingResponse.isCorrectConnection &&
          authServicePingResponse.versionEquality &&
          authServicePingResponse.customerEquality &&
          authServicePingResponse.environmentEquality) ||
        FALSE_STRING;
      if (authServicePingResponse) {
        if (!authServicePingResponse.versionEquality && authServicePingResponse.isCorrectConnection) {
          responseData.authServiceMeta = { versionEquality: authServicePingResponse.versionEquality };
        }
        if (!authServicePingResponse.customerEquality && authServicePingResponse.isCorrectConnection) {
          responseData.authServiceMeta = { ...responseData.authServiceMeta, customerEquality: authServicePingResponse.customerEquality };
        }
        if (!authServicePingResponse.environmentEquality && authServicePingResponse.isCorrectConnection) {
          responseData.authServiceMeta = { ...responseData.authServiceMeta, environmentEquality: authServicePingResponse.environmentEquality };
        }
      } else {
        responseData.authServiceMeta = { ...responseData.authServiceMeta, error: authServicePingResponseError };
      }

      let persistLinkPingResponse;
      let persistLinkPingResponseError;
      try {
        persistLinkPingResponse = await this.sendPingRequest(PERSIST_LINK_SERVICE_NAME);
      } catch (error) {
        console.log(error && error.message);
        persistLinkPingResponseError = error && error.message;
      }
      responseData.correctPeristLinkConnection =
        (persistLinkPingResponse &&
          persistLinkPingResponse.isCorrectConnection &&
          persistLinkPingResponse.versionEquality &&
          persistLinkPingResponse.customerEquality &&
          persistLinkPingResponse.environmentEquality) ||
        FALSE_STRING;
      if (persistLinkPingResponse) {
        if (!persistLinkPingResponse.versionEquality && persistLinkPingResponse.isCorrectConnection) {
          responseData.pLinkMeta = { versionEquality: persistLinkPingResponse.versionEquality };
        }
        if (!persistLinkPingResponse.customerEquality && persistLinkPingResponse.isCorrectConnection) {
          responseData.pLinkMeta = { ...responseData.pLinkMeta, customerEquality: persistLinkPingResponse.customerEquality };
        }
        if (!persistLinkPingResponse.environmentEquality && persistLinkPingResponse.isCorrectConnection) {
          responseData.pLinkMeta = { ...responseData.pLinkMeta, environmentEquality: persistLinkPingResponse.environmentEquality };
        }
      } else {
        responseData.pLinkMeta = { ...responseData.pLinkMeta, error: persistLinkPingResponseError };
      }
    }

    // Response.
    res.send(responseData);
  }

  /**
   * Send ping request to eds server.
   */
  async sendPingRequest(serviceName) {
    let pingUrl;
    let headers;
    switch (serviceName) {
      case PERSIST_LINK_SERVICE_NAME: {
        pingUrl = conf.pingRoutes.persistLink || PERSIST_LINK_PING_URL;
        headers = {};
        break;
      }
      case AUTH_SERVICE_NAME: {
        pingUrl = (conf.pingRoutes.authService || AUTH_SERVICE_PING_URL) + '_with_auth';
        headers = { Authorization: 'Basic ' + Buffer.from(conf.auth_server.user + ':' + conf.auth_server.password, 'utf8').toString('base64') };
        break;
      }
      default:
        throw new Error('Not correct service name');
    }

    const response = await axios({ url: pingUrl, method: 'GET', headers });

    const responseData = response && response.data;
    const version = response && response.headers && response.headers.version;
    const customer = response && response.headers && response.headers.customer;
    const environment = response && response.headers && response.headers.environment;
    const versionEquality = this.checkServiceVersion(serviceName, version);
    const serviceCustomer = (conf && conf.customer) || DEFAULT_CUSTOMER;
    const serviceEnvironment = (conf && conf.environment) || DEFAULT_ENVIRONMENT;
    const customerEquality = serviceCustomer === customer;
    const environmentEquality = serviceEnvironment === environment;
    const isCorrectConnection =
      (responseData && responseData.data && responseData.data.message && responseData.data.message === MESSAGE_PONG) ||
      (responseData && responseData.message && responseData.message === MESSAGE_PONG)
        ? true
        : false;
    return { isCorrectConnection, versionEquality, customerEquality, environmentEquality, responseData };
  }

  /**
   * @private
   * Check service version.
   * @param {string} serviceName Service name.
   * @param {string} serviceVersion Service version.
   */
  checkServiceVersion(serviceName, serviceVersion) {
    const serviceVersionInfo = conf && conf.versions && conf.versions.services.find((v) => v.name === serviceName);
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
};

module.exports = TestController;

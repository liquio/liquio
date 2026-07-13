// Imports.
import axios from 'axios';
import { Router } from 'restify-router';
import { checkAuth } from './auth';
import { conf } from '../config/config';

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
export class TestController {
  constructor(server: any) {
    this.registerRoutes();
    return routerInstance.applyRoutes(server) as any;
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
  async ping(req: any, res: any) {
    // Define params.
    const healthCheck = req.query.health_check;

    // Prepare response data.
    const processPid = process.pid;
    const responseData: any = {
      processPid,
      message: MESSAGE_PONG,
    };

    if (healthCheck) {
      let authServicePingResponse: any;
      let authServicePingResponseError;
      try {
        authServicePingResponse = await this.sendPingRequest(AUTH_SERVICE_NAME);
      } catch (error: any) {
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

      let persistLinkPingResponse: any;
      let persistLinkPingResponseError;
      try {
        persistLinkPingResponse = await this.sendPingRequest(PERSIST_LINK_SERVICE_NAME);
      } catch (error: any) {
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
  async sendPingRequest(serviceName: any) {
    let pingUrl;
    let headers;
    switch (serviceName) {
      case PERSIST_LINK_SERVICE_NAME: {
        pingUrl = (conf as any).pingRoutes.persistLink || PERSIST_LINK_PING_URL;
        headers = {};
        break;
      }
      case AUTH_SERVICE_NAME: {
        pingUrl = ((conf as any).pingRoutes.authService || AUTH_SERVICE_PING_URL) + '_with_auth';
        const basicAuthToken =
          (conf as any).auth_server.basicAuthToken || Buffer.from((conf as any).auth_server.user + ':' + (conf as any).auth_server.password, 'utf8').toString('base64');
        headers = { Authorization: basicAuthToken.startsWith('Basic ') ? basicAuthToken : 'Basic ' + basicAuthToken };
        break;
      }
      default:
        throw new Error('Not correct service name');
    }

    const response = await axios({ url: pingUrl, method: 'GET', headers });

    const responseData = response && response.data;
    const version = response && response.headers && (response.headers as any).version;
    const customer = response && response.headers && (response.headers as any).customer;
    const environment = response && response.headers && (response.headers as any).environment;
    const versionEquality = this.checkServiceVersion(serviceName, version);
    const serviceCustomer = ((conf as any) && (conf as any).customer) || DEFAULT_CUSTOMER;
    const serviceEnvironment = ((conf as any) && (conf as any).environment) || DEFAULT_ENVIRONMENT;
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
  checkServiceVersion(serviceName: any, serviceVersion: any) {
    const serviceVersionInfo = (conf as any) && (conf as any).versions && (conf as any).versions.services.find((v: any) => v.name === serviceName);
    const serviceMinVersion = (serviceVersionInfo && serviceVersionInfo.minVersion) || DEFAULT_VERSION;
    if (!serviceMinVersion || !serviceVersion) {
      global.log.save('can-not-find-service-min-version');
      return false;
    }

    const [versionMajor, versionMinor, versionPatch] = serviceVersion.split('.').map((v: string) => parseInt(v));
    const [minVersionMajor, minVersionMinor, minVersionPatch] = serviceMinVersion.split('.').map((v: string) => parseInt(v));

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
}

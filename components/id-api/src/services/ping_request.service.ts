import { HttpRequest } from '../lib/http_request';
import { BaseService } from './base_service';

const NOTIFY_SERVICE_NAME = 'notify';
const EDS_SERVICE_NAME = 'eds';
const ANSWER_MSG_PONG = 'pong';
const DEFAULT_VERSION = '0.0.0';
const DEFAULT_CUSTOMER = '1';
const DEFAULT_ENVIRONMENT = '0';

export class PingRequestService extends BaseService {
  /**
   * Send ping request to eds server.
   */
  async sendPingRequest(serviceName: string) {
    let pingUrl: string;
    switch (serviceName) {
      case NOTIFY_SERVICE_NAME: {
        pingUrl = this.config.pingRoutes!.notify + '_with_auth';
        break;
      }
      case EDS_SERVICE_NAME: {
        pingUrl = this.config.pingRoutes!.eds!;
        break;
      }
      default:
        throw new Error('Not correct service name');
    }

    // Do request.
    const responseData = await HttpRequest.send({
      url: pingUrl,
      method: HttpRequest.Methods.GET,
      headers: { Authorization: this.config.notify!.authorization },
    });
    const body: any = responseData?.data;
    const isCorrectConnection = body?.data?.message === ANSWER_MSG_PONG || body?.message === ANSWER_MSG_PONG;
    const wideCheckRes = this.wideCheck(responseData, serviceName, isCorrectConnection);
    return { isCorrectConnection, wideCheckRes };
  }

  /**
   * Check service version.
   */
  private checkServiceVersion(serviceName: string, serviceVersion: string) {
    const serviceVersionInfo = this.config.versions?.services.find((v) => v.name === serviceName);
    const serviceMinVersion = serviceVersionInfo?.minVersion ?? DEFAULT_VERSION;
    if (!serviceMinVersion || !serviceVersion) {
      this.log.save('can-not-find-service-min-version');
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
   * Check customer.
   */
  private checkCustomer(partnerServiceCustomer: string) {
    const curentServiceCustomer = this.config.customer ?? DEFAULT_CUSTOMER;
    if (!partnerServiceCustomer || !curentServiceCustomer) {
      this.log.save('ping-can-not-check-services-customer');
      return false;
    }
    return curentServiceCustomer === partnerServiceCustomer;
  }

  /**
   * Check environment.
   */
  private checkEnvironment(partnerServiceEnvironment: string) {
    const curentServiceEnvironment = this.config.environment ?? DEFAULT_ENVIRONMENT;
    if (!partnerServiceEnvironment || !curentServiceEnvironment) {
      this.log.save('ping-can-not-check-services-environment');
      return false;
    }
    return curentServiceEnvironment === partnerServiceEnvironment;
  }

  /**
   * Wide check services.
   */
  private wideCheck(serviceResponse: any, serviceName: string, serviceMessage: boolean) {
    const version = serviceResponse?.headers?.version;
    const customer = serviceResponse?.headers?.customer;
    const environment = serviceResponse?.headers?.environment;
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

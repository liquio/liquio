import { Provider } from './provider';
import { HttpRequest } from '../../../../../lib/http_request';

/**
 * Liquio provider.
 * @extends Provider
 */
export class LiquioProvider extends Provider {
  static singleton: LiquioProvider;

  config: any;
  server: any;
  port: any;
  routes: any;
  user: any;
  hashedPassword: any;
  headers: Record<string, string>;

  /**
   * Constructor.
   * @param {object} config Config.
   */
  constructor(config: any) {
    // Define singleton.
    if (!LiquioProvider.singleton) {
      super();

      this.config = config;
      this.server = config.server;
      this.port = config.port;
      this.routes = config.routes;
      this.user = config.user;
      this.hashedPassword = config.hashedPassword;
      const authToken = Buffer.from(`${this.user}:${this.hashedPassword}`).toString('base64');
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${authToken}`,
      };
      LiquioProvider.singleton = this;
    }

    return LiquioProvider.singleton;
  }

  /**
   * @param {string} id
   * @override
   */
  async detail(id: string): Promise<any> {
    try {
      global.log.save('document-detail-request', id);
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${this.routes.documentsCRUD}/${id}`,
        method: HttpRequest.Methods.GET,
        headers: this.headers,
      });
      global.log.save('document-detail-response', response);
    } catch (error: any) {
      global.log.save('document-detail-error', error.message);
      throw error;
    }
  }

  /**
   * @param {object} data
   * @override
   */
  async register(data: any): Promise<any> {
    try {
      global.log.save('document-register-request', data);
      console.log(this.headers);
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${this.routes.documentsCRUD}`,
        method: HttpRequest.Methods.POST,
        headers: this.headers,
        body: data,
      });
      global.log.save('document-register-response', response);
      return response;
    } catch (error: any) {
      global.log.save('document-register-error', error.message);
      throw error;
    }
  }

  /**
   * @param {object} data
   * @override
   */
  async update(data: any): Promise<any> {
    try {
      global.log.save('document-update-request', data);
      console.log(this.headers);
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${this.routes.documentsCRUD}`,
        method: HttpRequest.Methods.PUT,
        headers: this.headers,
        body: data,
      });
      global.log.save('document-update-response', response);
    } catch (error: any) {
      global.log.save('document-update-error', error.message);
      throw error;
    }
  }

  /**
   * @param {object} data
   * @override
   */
  async revoke(data: any): Promise<any> {
    try {
      global.log.save('document-revoke-request', data);
      console.log(this.headers);
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${this.routes.documentsRevoke}`,
        method: HttpRequest.Methods.POST,
        headers: this.headers,
        body: data,
      });
      global.log.save('document-revoke-response', response);
    } catch (error: any) {
      global.log.save('document-revoke-error', error.message);
      throw error;
    }
  }
}

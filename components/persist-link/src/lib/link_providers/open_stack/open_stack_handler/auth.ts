// Import.
import PropByPath from 'prop-by-path';

import { getLog } from '../../../context';
import HttpRequest from './http_request';

// Constants.
const ERROR_MESSAGE_TOKEN_NOT_RESPONSED = 'Token not responsed from OpenStack server.';
const ERROR_MESSAGE_TENANT_TOKEN_NOT_RESPONSED = 'Tenant token not responsed from OpenStack server.';

/**
 * Auth.
 */
class Auth {
  /**
   * Auth constructor.
   * @param {object} moduleContext OpenStack module context.
   */
  constructor(moduleContext) {
    // Save params.
    this.moduleContext = moduleContext;
  }

  /**
   * Get token.
   * @param {boolean} [isAdmin] Is admin.
   * @returns {Promise<string>} Token promise.
   */
  async getToken(isAdmin = false) {
    // Prepare request to get token.
    const accounts = this.moduleContext.accounts;
    const account = isAdmin ? accounts.admin : accounts.user;
    const bodyObject = {
      auth: {
        passwordCredentials: {
          username: account.login,
          password: account.password,
        },
      },
    };

    // Do request to get token.
    const response = await HttpRequest.send({
      url: `${this.moduleContext.server}:${this.moduleContext.port}${this.moduleContext.routes.getTokens}`,
      method: HttpRequest.Methods.POST,
      headers: { 'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON },
      body: JSON.stringify(bodyObject),
    });

    // Check response.
    const token = PropByPath.get(response, 'access.token.id');
    if (!token) {
      getLog().save('login-error-openstack-response-without-token', response);
      throw new Error(ERROR_MESSAGE_TOKEN_NOT_RESPONSED);
    }

    // Return token.
    return token;
  }

  /**
   * Get tenant auth info.
   * @param {boolean} [isAdmin] Is admin.
   * @returns {Promise<{tenantToken: string, tenantId: string, tenantPublicUrl: string}>} Tenant auth info promise.
   */
  async getTenantAuthInfo(isAdmin = false) {
    // Get token.
    const token = await this.getToken(isAdmin);

    // Prepare request to get tenant token.
    const tenantName = this.moduleContext.tenantName;
    const bodyObject = {
      auth: {
        tenantName,
        token: {
          id: token,
        },
      },
    };

    // Do request to get token.
    const response = await HttpRequest.send({
      url: `${this.moduleContext.server}:${this.moduleContext.port}${this.moduleContext.routes.getTokens}`,
      method: HttpRequest.Methods.POST,
      headers: { 'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON },
      body: JSON.stringify(bodyObject),
    });

    // Check response.
    const tenantToken = PropByPath.get(response, 'access.token.id');
    const tenantId = PropByPath.get(response, 'access.token.tenant.id');
    if (!tenantId) {
      getLog().save('login-error-openstack-response-without-tenant-token', response);
      throw new Error(ERROR_MESSAGE_TENANT_TOKEN_NOT_RESPONSED);
    }
    const serviceCatalog = PropByPath.get(response, 'access.serviceCatalog');
    const endpoints = serviceCatalog.reduce((total, currentItem) => {
      return [...total, ...currentItem.endpoints];
    }, []);
    const publicUrls = endpoints.map((endpoint) => endpoint.publicURL);
    const tenantPublicUrl = publicUrls.find((url) => url.includes(tenantId));

    // Return token.
    const tenantAuthInfo = { tenantId, tenantToken, tenantPublicUrl };
    getLog().save('open-stack-auth', tenantAuthInfo);
    return tenantAuthInfo;
  }
}

// Export.
export default Auth;

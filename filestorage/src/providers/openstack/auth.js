const _ = require('lodash');
const HttpRequest = require('../../lib/http_request');

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
   * Get token for OpenStack v2.
   * @returns {Promise<string>} Token promise.
   */
  async getTokenV2() {
    // Prepare request to get token.
    const account = this.moduleContext.account;
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
      url: `${this.moduleContext.server}${this.moduleContext.routes.getTokens}`,
      method: HttpRequest.Methods.POST,
      headers: { 'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON },
      body: JSON.stringify(bodyObject),
    });

    // Check response.
    // const token = PropByPath.get(response, 'access.token.id');
    const token = _.get(response, 'access.token.id');
    if (!token) {
      log.save('login-error-openstack-response-without-token', response);
      throw new Error('Token not responsed from OpenStack server.');
    }

    // Return token.
    return token;
  }

  /**
   * Get tenant auth info.
   * @returns {Promise<{tenantToken: string, tenantId: string, tenantPublicUrl: string}>} Tenant auth info promise.
   */
  async getTenantAuthInfo() {
    // Check cache.
    const authCacheTtl = this.moduleContext.authCacheTtl || 30000;
    if (this.tenantAuthInfoCache && this.tenantAuthInfoCache.createdAt && +new Date() - this.tenantAuthInfoCache.createdAt < authCacheTtl) {
      return this.tenantAuthInfoCache.data;
    }

    // Get tenant auth info accordance to auth version.
    let tenantAuthInfo;
    switch (this.moduleContext.authVersion) {
      case 2:
        tenantAuthInfo = await this.getTenantAuthInfoV2();
        break;
      case 3:
        tenantAuthInfo = await this.getTenantAuthInfoV3();
        break;
      default:
        tenantAuthInfo = await this.getTenantAuthInfoV3();
    }
    if (tenantAuthInfo && tenantAuthInfo.tenantToken && tenantAuthInfo.tenantPublicUrl) {
      // Cache data.
      this.tenantAuthInfoCache = { data: tenantAuthInfo, createdAt: +new Date() };
    }
    return tenantAuthInfo;
  }

  /**
   * Get tenant auth info for OpenStack v2.
   * @returns {Promise<{tenantToken: string, tenantId: string, tenantPublicUrl: string}>} Tenant auth info promise.
   */
  async getTenantAuthInfoV2() {
    // Get token.
    const token = await this.getTokenV2();

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

    // Save handling start timestamp.
    const startTimestamp = Date.now();

    // Do request to get token.
    const response = await HttpRequest.send({
      url: `${this.moduleContext.server}${this.moduleContext.routes.getTokens}`,
      method: HttpRequest.Methods.POST,
      headers: { 'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON },
      body: JSON.stringify(bodyObject),
    });

    // Save handling end timestamp.
    const endTimestamp = Date.now();
    const handlingTime = endTimestamp - startTimestamp;
    const handlingInfo = { startTimestamp, endTimestamp, handlingTime };

    // Check response.
    const tenantToken = _.get(response, 'access.token.id');
    const tenantId = _.get(response, 'access.token.tenant.id');
    if (!tenantId) {
      log.save('login-error-openstack-response-without-tenant-token', response);
      throw new Error('Tenant token not responsed from OpenStack server.');
    }
    const serviceCatalog = _.get(response, 'access.serviceCatalog');
    const endpoints = serviceCatalog.reduce((total, currentItem) => {
      return [...total, ...currentItem.endpoints];
    }, []);
    const publicUrls = endpoints.map((endpoint) => endpoint.publicURL);
    const tenantPublicUrl = publicUrls.find((url) => url.includes(tenantId));

    // Return auth info.
    const tenantAuthInfo = { tenantId, tenantToken, tenantPublicUrl };
    log.save('open-stack-auth', { tenantAuthInfo, handlingInfo });
    return tenantAuthInfo;
  }

  /**
   * Get tenant auth info for OpenStack v3.
   * @returns {Promise<{tenantToken: string, tenantId: string, tenantPublicUrl: string}>} Tenant auth info promise.
   */
  async getTenantAuthInfoV3() {
    // Prepare request to get tenant token.
    const account = this.moduleContext.account;
    let bodyObject = {
      auth: {
        identity: {
          methods: ['password'],
          password: {
            user: {
              name: account.login,
              domain: { id: account.domainId || 'default' },
              password: account.password,
            },
          },
        },
      },
    };
    if (account.projectId) {
      bodyObject.auth.scope = {
        project: {
          name: account.projectId,
          domain: { id: account.domainId || 'default' },
        },
      };
    }

    // Save handling start timestamp.
    const startTimestamp = Date.now();

    // Do request to get token.
    const detailedResponse = await HttpRequest.sendDetailed({
      url: `${this.moduleContext.server}${this.moduleContext.routes.getTokens}`,
      method: HttpRequest.Methods.POST,
      headers: { 'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON },
      body: JSON.stringify(bodyObject),
    });

    // Save handling end timestamp.
    const endTimestamp = Date.now();
    const handlingTime = endTimestamp - startTimestamp;
    const handlingInfo = { startTimestamp, endTimestamp, handlingTime };

    // Check response.
    const responseBody = detailedResponse && detailedResponse.body;
    const responseHeaders = detailedResponse && detailedResponse.headers;
    const tenantToken = responseHeaders && responseHeaders['x-subject-token'];
    const swiftCatalog =
      responseBody && responseBody.token && responseBody.token.catalog && responseBody.token.catalog.find((v) => v.name === 'swift');
    const publicEndpoint = swiftCatalog && swiftCatalog.endpoints && swiftCatalog.endpoints.find((v) => v.interface === 'public');
    const tenantPublicUrl = publicEndpoint && publicEndpoint.url;
    const tenantId = publicEndpoint && publicEndpoint.id;

    // Return auth info.
    const tenantAuthInfo = { tenantId, tenantToken, tenantPublicUrl };
    log.save('open-stack-auth', { tenantAuthInfo, handlingInfo, raw: detailedResponse });
    return tenantAuthInfo;
  }
}

// Export.
module.exports = Auth;

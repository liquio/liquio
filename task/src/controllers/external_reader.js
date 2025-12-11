
const uuid = require('uuid-random');

const Controller = require('./controller');
const ExternalReader = require('../lib/external_reader');
const typeOf = require('../lib/type_of');

/**
 * External reader controller.
 */
class ExternalReaderController extends Controller {
  /**
   * External reader controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!ExternalReaderController.singleton) {
      // Save params.
      super(config);
      this.externalReader = new ExternalReader();

      // Define singleton.
      ExternalReaderController.singleton = this;
    }

    // Return singleton.
    return ExternalReaderController.singleton;
  }

  /**
   * Get captcha challenge.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @return {Promise<{challenge: string}>}
   */
  async getCaptchaChallenge(req, res) {
    try {
      const { service, method } = req.params;
      const { data: response } = await this.externalReader.getCaptchaChallenge(service, method);
      return this.responseData(res, response?.challenge || {
        enabled: false,
        challenge: null,
      }, true);
    } catch (error) {
      log.save('external-reader|get-captcha-challenge|error', { error: error && error.message || error }, 'error');
      return this.responseError(res, error);
    }
  }

  /**
   * Get data.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getData(req, res) {
    const oauthToken = this.getRequestUserAccessToken(req);
    const user = this.getRequestUserInfo(req);
    const { head, member } = this.getRequestUserUnitIds(req);
    const userUnits = { head, member };
    const { service, method, captchaPayload, filters: nonUserFilter, extraParams } = req.body;
    const enabledMocksHeader = req.get('enabled-mocks');

    // Check that method is accessible by this route.
    if (global.config.external_reader?.strictThroughDocumentAccess?.includes(`${service}.${method}`)) {
      return this.responseError(res, 'Method is not accessible according to access rules', 400);
    }

    // Check params.
    const isWrongParam = (param) => typeof param !== 'string' || param.split('').some(p => ['/', '?'].includes(p));
    if (isWrongParam(service) || isWrongParam(method)) {
      log.save('external-reader|get-data|params-error', { service, method }, 'error');
      return this.responseError(res, 'Incorrect service or method name.', 400);
    }

    // Get data.
    let data;
    let meta;
    try {
      const getDataByUserResponse = await this.externalReader.getDataByUser(
        service, 
        method, 
        captchaPayload,
        oauthToken, 
        user, 
        nonUserFilter,
        extraParams,
        userUnits,
        enabledMocksHeader
      );
      data = getDataByUserResponse.data;
      meta = getDataByUserResponse.meta;
    } catch (error) {
      log.save('external-reader|get-data|error', { error: error && error.message || error, service, method, nonUserFilter, user }, 'error');

      let code = 500;
      if (error.message.includes('Authentication error')) {
        code = 401;
      }

      return this.responseError(res, error.message, code);
    }
    const isDataWithPagination = !!meta;
    const dataToResponse = isDataWithPagination ? { data, meta } : data;

    this.responseData(res, dataToResponse, isDataWithPagination);
  }

  /**
   * Get data async.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getDataAsync(req, res) {
    // Get params.
    const token = req.headers['token'];
    const oauthToken = this.getRequestUserAccessToken(req);
    const user = this.getRequestUserInfo(req);
    const { head, member } = this.getRequestUserUnitIds(req);
    const userUnits = { head, member };
    const { service, method, filters: nonUserFilter, extraParams, captchaPayload } = req.body;
    let { requestId } = req.body;
    const enabledMocksHeader = req.get('enabled-mocks');

    if (!global.redisClient) {
      log.save('external-reader|get-data-async|redis-error', { error: 'Redis client is not initialized' }, 'error');
      return this.responseError(res, 'Redis client is not initialized', 500);
    }

    if (requestId) {
      log.save('external-reader|get-data-async|request-id', { requestId }, 'info');
      const requestData = await global.redisClient.get(`external-reader-request-id:${requestId}`);

      if (requestData) {
        return this.responseData(res, JSON.parse(requestData));
      }

      return this.responseError(res, 'Request not found', 404);
    }

    // Check params.
    const isWrongParam = (param) => typeof param !== 'string' || param.split('').some(p => ['/', '?'].includes(p));
    if (isWrongParam(service) || isWrongParam(method)) {
      log.save('external-reader|get-data|params-error', { service, method }, 'error');
      return this.responseError(res, 'Incorrect service or method name.', 400);
    }

    requestId = uuid();

    await global.redisClient.set(`external-reader-request-id:${requestId}`, {
      status: 'processing'
    }, 60 * 60);

    (async () => {
      try {
        const getDataByUserResponse = (await this.externalReader.getDataByUser(
          service,
          method,
          captchaPayload,
          oauthToken,
          user,
          nonUserFilter,
          extraParams,
          userUnits,
          enabledMocksHeader,
          token,
          this.config.external_reader.asyncTimeout || 1000 * 60 * 60
        ));

        await global.redisClient.set(`external-reader-request-id:${requestId}`, {
          data: getDataByUserResponse.data,
          meta: getDataByUserResponse.meta,
        }, 60 * 60);

      } catch (error) {
        log.save('external-reader|get-data|error', { error: error && error.message || error, service, method, nonUserFilter, user }, 'error');

        let code = 500;
        if (error.message.includes('Authentication error')) {
          code = 401;
        }

        await global.redisClient.set(`external-reader-request-id:${requestId}`, {
          errorCode: code,
          error: error.message
        }, 60 * 60);
      }
    })();

    this.responseData(res, { requestId });
  }

  /**
   * @param {e.Request} req
   * @param {e.Response} res
   * @return {Promise<void>}
   */
  async getMocksKeysByUser(req, res) {
    const authAccessToken = this.getRequestUserAccessToken(req);
    let readers = req.query.readers;
    readers = typeOf(readers) === 'array' ? readers : typeOf(readers) === 'string' ? [readers] : null;

    let mocksKeysByUser;
    try {
      mocksKeysByUser = await this.externalReader.getMocksKeysByUser(authAccessToken, readers);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, mocksKeysByUser);
  }

  /**
   * Delete cache
   * @param {e.request} req
   * @param {e.response} res
   * @return {Promise<void>}
   */
  async deleteCache(req, res) {
    // Get params.
    const oauthToken = this.getRequestUserAccessToken(req);
    const user = this.getRequestUserInfo(req);

    // Get data.
    let response;
    try {
      response = await this.externalReader.deleteCacheByUser(oauthToken, user);
    } catch (error) {
      log.save('external-reader|delete-cache|error', { error: error && error.message || error, user }, 'error');
      return this.responseError(res, error.message);
    }

    this.responseData(res, response, true);
  }

  /**
   * Delete cache
   * @param {e.request} req
   * @param {e.response} res
   * @return {Promise<{isEnabledFor: string[]}>}
   */
  async getCaptchProviders(req, res) {
    try {
      log.save('external-reader|get-captcha-providers|info', { endpoint: 'external-reader/captcha/providers/list' }, 'info');

      const { data: response } = await this.externalReader.getCaptchProviders();

      return this.responseData(res, response);
    } catch (error) {
      log.save('external-reader|get-captcha-providers|error', { error: error && error.message || error }, 'error');
      return this.responseError(res, error);
    }
  }
}

module.exports = ExternalReaderController;

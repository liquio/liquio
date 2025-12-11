const _ = require('lodash');
const transliteration = require('transliteration');

const Entity = require('../entities/entity');
const { matchedData } = require('express-validator');
const File = require('../types/file');
const Stream = require('../lib/stream');
const { getTraceId } = require('../lib/async_local_storage');

// Constants.
const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_ACCEPTED = 202;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const EMPTY_DATA = {};
const DEFAULT_ERROR_MESSAGE = 'Server error.';
const CONTENT_TYPE_HEADER = 'Content-Type';
const CONTENT_DISPOSITION_HEADER = 'Content-Disposition';

/**
 * Controller.
 */
class Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Response data.
   * @param {object} res HTTP response.
   * @param {object} [data] Data to response.
   * @param {boolean} [pagination] Pagination.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseData(res, data = EMPTY_DATA, pagination = false, httpStatusCode = HTTP_STATUS_CODE_OK) {
    // Define response object.
    const responseObject = pagination ? data : { data };

    // Define response meta.
    const url = res.req.originalUrl;
    const method = res.req.method;
    const responseMeta = res.responseMeta ? { ...res.responseMeta, uriPattern: `${method}:${url}` } : { uriPattern: `${method}:${url}` };

    // Log.
    log.save('http-response', { meta: responseMeta });

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response error.
   * @param {object} res HTTP response.
   * @param {string|Error} [error] Error instance or message.
   * @param {number} [httpStatusCode] HTTP status code.
   * @param {object[]} [details] Details.
   */
  responseError(res, error = DEFAULT_ERROR_MESSAGE, httpStatusCode = HTTP_STATUS_CODE_SERVER_ERROR, details = []) {
    // Define params.
    const message = (error && error.message) || error;

    // Set error status code if exists.
    if (error.httpStatusCode) {
      httpStatusCode = error.httpStatusCode;
    }

    log.save('stack', error.stack);

    // Define response object.
    const responseObject = { error: { message }, traceId: getTraceId() };

    if (details.length && Array.isArray(details)) {
      responseObject.details = details.filter(Boolean).map((detail) => {
        if (typeof detail === 'object') {
          const { message, name, details, httpStatusCode } = detail;
          return { message, name, details, httpStatusCode };
        }
        return detail;
      });
    } else if (details.length) {
      responseObject.details = details;
    }

    // Define response meta.
    const url = res.req.originalUrl;
    const method = res.req.method;
    const responseMeta = res.responseMeta ? { ...res.responseMeta, uriPattern: `${method}:${url}` } : { uriPattern: `${method}:${url}` };

    // Log.
    log.save('http-response', { meta: responseMeta, error: responseObject });

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response that accepted.
   * @param {object} res HTTP response.
   */
  responseThatAccepted(res) {
    // Define response object.
    const responseObject = { data: { isAccepted: true } };

    // Define response meta.
    const url = res.req.originalUrl;
    const method = res.req.method;
    const responseMeta = res.responseMeta ? { ...res.responseMeta, uriPattern: `${method}:${url}` } : { uriPattern: `${method}:${url}` };

    // Log.
    log.save('http-response', { meta: responseMeta });

    // Response.
    res.status(HTTP_STATUS_CODE_ACCEPTED).send(responseObject);
  }

  /**
   * Redirect.
   * @param {object} res HTTP response.
   * @param {any} params Params.
   */
  redirect(res, ...params) {
    // Log.
    log.save('http-redirect', Array.isArray(params) && params.length === 1 ? params[0] : params);

    // Redirect.
    res.redirect(...params);
  }

  /**
   * Filter response.
   * @param {Entity[]|Entity} data Data.
   * @param {boolean} [brief] getFilterPropertiesBrief method.
   * @returns {array|object}
   */
  filterResponse(data, brief = false) {
    return Entity.filterResponse(data, brief);
  }

  /**
   * Response file.
   * @param {object} res HTTP response.
   * @param {Buffer} file File content as buffer.
   * @param {string} contentType Content-type.
   * @param {string} [fileName] File name.
   */
  responseFile(res, file, contentType, fileName) {
    // Response.
    res.set(CONTENT_TYPE_HEADER, contentType);
    if (fileName) {
      const convertedFileName = _.toLower(transliteration.transliterate(fileName)).replace(/\s+/g, '_');
      res.set(CONTENT_DISPOSITION_HEADER, `attachment; filename="${convertedFileName}"`);
    }
    res.send(file);
  }

  /**
   * Get request user info.
   * @param {object} req HTTP request.
   * @returns {object}
   */
  getRequestUserInfo(req) {
    return req && req.authUserInfo;
  }

  /**
   * Get request user info.
   * @param {object} req HTTP request.
   * @returns {object}
   */
  getRequestUserBaseInfo(req) {
    return (
      req &&
      req.authUserInfo && {
        userId: req.authUserInfo.userId,
        email: req.authUserInfo.email,
        ipn: req.authUserInfo.ipn,
        name: req.authUserInfo.name,
        lastName: req.authUserInfo.last_name,
        firstName: req.authUserInfo.first_name,
        middleName: req.authUserInfo.middle_name,
      }
    );
  }

  /**
   * Get request access info.
   * @param {object} req HTTP request.
   * @returns {{userId, userName}}
   */
  getRequestAccessInfo(req) {
    const { userId = null, name: userName = null } = (req && req.authUserInfo) || {};

    return {
      userId,
      userName,
    };
  }

  /**
   * Get request user ID.
   * @param {object} req HTTP request.
   * @returns {string}
   */
  getRequestUserId(req) {
    return req && req.authUserInfo && req.authUserInfo.userId;
  }

  /**
   * Get request user roles.
   * @param {object} req HTTP request.
   * @returns {string[]} Roles.
   */
  getRequestUserRoles(req) {
    return req && req.authUserRoles;
  }

  /**
   * Get request user unit IDs.
   * @param {object} req HTTP request.
   * @returns {{head: number[], member: number[], all: number[]}} Unit IDs.
   */
  getRequestUserUnitIds(req) {
    return req.authUserUnitIds;
  }

  /**
   * Convert Undescore keys to CamelCase.
   * @param {object} data Data object.
   * @returns {object}
   */
  convertUnderscoreKeysToCamelCase(data) {
    const mapKeysDeep = (obj, cb) => _.mapValues(_.mapKeys(obj, cb), (val) => (_.isObject(val) ? mapKeysDeep(val, cb) : val));

    return mapKeysDeep(data, (value, key) => {
      return _.camelCase(key);
    });
  }

  /**
   * Method handler
   *  - getting params
   *  - running necessary method
   *  - logging
   *  - catching errors
   * @param {string} methodName Method name.
   * @param {boolean} isParseBody Is parse request body.
   */
  methodHandler(methodName, isParseBody = true) {
    return async (req, res) => {
      const userId = this.getRequestUserId && this.getRequestUserId(req);
      const userUnitIds = this.getRequestUserUnitIds && this.getRequestUserUnitIds(req);

      const [params, query] = ['params', 'query'].map((locations) => matchedData(req, { locations }));

      let body;
      if (isParseBody) {
        body = matchedData(req, { locations: 'body' });
      } else {
        let fileContentBuffer;
        let chunks = [];
        req.on('data', (data) => chunks.push(data));
        req.on('end', () => (fileContentBuffer = Buffer.concat(chunks)));
        await Stream.waitEndEvent(req);
        body = fileContentBuffer.toString();
      }

      try {
        const result = await this[methodName]({ params, body, query, userId, userUnitIds });
        if (result instanceof File) {
          return this.responseFile(res, result.content, result.dataType, result.name);
        }
        this.responseData(res, result);
      } catch (error) {
        log.save('controller-error', { methodName, error: error.toString(), cause: error.cause, stack: error.stack });
        return this.responseError(res, error);
      }
    };
  }
}

module.exports = Controller;

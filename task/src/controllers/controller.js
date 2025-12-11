
const crypto = require('crypto');
const _ = require('lodash');
const transliteration = require('transliteration');
const { appendTraceMeta, getTraceMeta, getTraceId } = require('../lib/async_local_storage');
const Entity = require('../entities/entity');
const XmlJsConverter = require('../lib/xml_js_converter');
const { matchedData } = require('express-validator');
const { SequelizeDbError } = require('../lib/errors');

// Constants.
const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_ACCEPTED = 202;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const EMPTY_DATA = {};
const EMPTY_TEXT = '';
const CONTENT_TYPE_HEADER = 'Content-Type';
const CONTENT_DISPOSITION_HEADER = 'Content-Disposition';
const DEFAULT_ERROR_MESSAGE = 'Server error.';
const RESPONSE_REPLACEMENT_TEXT = '*****';

/**
 * Controller.
 */
class Controller {
  /**
   * Controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    this.config = config;
    this.xmlJsConverter = new XmlJsConverter();
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
    if (this.writeResponseObjectToLog(res.req.originalUrl)) {
      log.save('http-response|data', { ...responseMeta, ...responseObject });
    } else {
      log.save('http-response|data', { ...responseMeta, data: RESPONSE_REPLACEMENT_TEXT });
    }

    const traceMeta = getTraceMeta();
    if (traceMeta.externalReaderErrors) {
      res.set('external-reader-errors', traceMeta.externalReaderErrors);
    }
    if (traceMeta.returnedMocksHeader) {
      res.set('returned-mocks', traceMeta.returnedMocksHeader);
    }

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response text.
   * @param {object} res HTTP response.
   * @param {object} [text] Data to response.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseText(res, text = EMPTY_TEXT, httpStatusCode = HTTP_STATUS_CODE_OK) {
    // Log.
    const url = res.req.originalUrl;
    const method = res.req.method;
    const responseMeta = res.responseMeta ? { ...res.responseMeta, uriPattern: `${method}:${url}` } : { uriPattern: `${method}:${url}` };
    if (this.writeResponseObjectToLog(res.req.originalUrl)) {
      log.save('http-response|text', { ...responseMeta, text });
    } else {
      log.save('http-response|text', { ...responseMeta, data: RESPONSE_REPLACEMENT_TEXT });
    }

    // Response.
    res.status(httpStatusCode).send(text);
  }

  /**
   * Response xml.
   * @param {object} res HTTP response.
   * @param {object} [data] Data to response.
   * @param {boolean} needConvert
   * @param {number} [httpStatusCode] HTTP status code.
   * @return {Promise<void>}
   */
  async responseXml(res, data = EMPTY_DATA, needConvert = true, httpStatusCode = HTTP_STATUS_CODE_OK) {
    // Define response object.
    let responseData = needConvert ? await this.xmlJsConverter.convertJsonToXmlString(data) : data;

    // Define response meta.
    const url = res.req.originalUrl;
    const method = res.req.method;
    const responseMeta = res.responseMeta ? { ...res.responseMeta, uriPattern: `${method}:${url}` } : { uriPattern: `${method}:${url}` };

    // Log.
    if (this.writeResponseObjectToLog(res.req.originalUrl)) {
      log.save('http-response|xml', { ...responseMeta, data: responseData });
    } else {
      log.save('http-response|xml', { ...responseMeta, data: RESPONSE_REPLACEMENT_TEXT });
    }

    res.set(CONTENT_TYPE_HEADER, 'text/xml');

    // Response.
    res.status(httpStatusCode).send(responseData);
  }

  /**
   * Response that accepted.
   * @param {object} res HTTP response.
   */
  responseThatAccepted(res) {
    // Define response object.
    const handlingInfo = this.getHandlingInfo(res);
    const responseObject = { data: { isAccepted: true }, handlingInfo };

    // Define response meta.
    const url = res.req.originalUrl;
    const method = res.req.method;
    const responseMeta = res.responseMeta ? { ...res.responseMeta, uriPattern: `${method}:${url}` } : { uriPattern: `${method}:${url}` };

    // Log.
    log.save('http-response|accepted', { ...responseMeta, ...responseObject });

    // Response.
    res.status(HTTP_STATUS_CODE_ACCEPTED).send(responseObject);
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

    log.save('http-response|file', { fileName, contentType });

    res.send(file);
  }

  /**
   * Response error.
   * @param {object} res HTTP response.
   * @param {string|Error} [error] Error instance or message.
   * @param {number} [httpStatusCode] HTTP status code.
   * @param {any} [details] Details.
   */
  async responseError(res, error = DEFAULT_ERROR_MESSAGE, httpStatusCode = HTTP_STATUS_CODE_SERVER_ERROR, details) {
    // Set status code if exists or .
    if (error.httpStatusCode) {
      httpStatusCode = error.httpStatusCode;
    }

    // Define params.
    const message = error?.toString();
    const code = error?.code;
    const errorDetails = details || error?.cause || error?.details;
    const stack = error.stack;

    // Define response object.
    const responseObject = {
      error: {
        message,
        details: errorDetails,
        code,
      },
      traceId: getTraceId(),
    };

    // Define response meta.
    const url = res.req.originalUrl;
    const method = res.req.method;
    const responseMeta = res.responseMeta ? { ...res.responseMeta, uriPattern: `${method}:${url}` } : { uriPattern: `${method}:${url}` };

    let logObject = { ...responseMeta, ...responseObject };

    if (config.log?.stackTrace) {
      logObject = { ...logObject, error: { ...logObject.error, stack } };
    }

    // Log.
    const logId = await log.save('http-response|error', logObject, 'error');

    // Handle error.
    const traceMeta = this.getTraceMeta();
    if (traceMeta.externalReaderErrors) {
      res.set('external-reader-errors', traceMeta.externalReaderErrors);
    }

    if (traceMeta && traceMeta?.workflowId) {
      if (Array.isArray(errorDetails)) {
        // Ignore control: payment.widget, message: checkRequired error.
        const filteredErrorDetails = errorDetails.filter((v) => v?.control !== 'payment.widget' && v?.control !== 'payment.widget.new' && v?.message !== 'checkRequired error.');

        if (filteredErrorDetails.length) {
          models.workflowError.create({
            error: message,
            details: filteredErrorDetails,
            code,
            queueMessage: null,
            traceMeta,
            logId
          });
        }
      } else {
        models.workflowError.create({
          error: message,
          details: errorDetails,
          code,
          queueMessage: null,
          traceMeta,
          logId
        });
      }
    }

    // Delete logged requestBody.
    if (responseObject.error.message.startsWith('{"')) {
      try {
        responseObject.error.message = JSON.parse(responseObject.error.message);
        delete responseObject.error.message.requestBody;
        responseObject.error.message = JSON.stringify(responseObject.error.message);
      } catch (error) {
        log.save('try-to-parse-error-message', { message: responseObject.error.message, error: error.message }, 'error');
      }
    }

    if (error instanceof SequelizeDbError) {
      delete responseObject.error.details;
    }

    // Response.
    res.status(httpStatusCode).send(responseObject);
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
   * Get handling.
   * @private
   * @param {object} res HTTP response.
   * @returns {{handlingId, startTimestamp, endTimestamp, handlingTime}} Handling info.
   */
  getHandlingInfo(res) {
    // Check.
    if (typeof res !== 'object') {
      return;
    }
    if (typeof res.handlingInfo !== 'object') {
      return;
    }

    // Define and append handling info.
    const endTimestamp = Date.now();
    const handlingTime = res.handlingInfo.startTimestamp ? endTimestamp - res.handlingInfo.startTimestamp : null;
    res.handlingInfo = { ...res.handlingInfo, endTimestamp, handlingTime };
    return res.handlingInfo;
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
   * Get request user ID.
   * @param {object} req HTTP request.
   * @returns {string} Request user ID.
   */
  getRequestUserId(req) {
    return req && req.authUserInfo && req.authUserInfo.userId;
  }

  /**
   * Get request user IPN.
   * @param {object} req HTTP request.
   * @returns {string} Request user IPN.
   */
  getRequestUserIpn(req) {
    return req && req.authUserInfo && req.authUserInfo.ipn;
  }

  /**
   * Get request user EDRPOU.
   * @param {object} req HTTP request.
   * @returns {string} Request user EDRPOU.
   */
  getRequestUserEdrpou(req) {
    return req && req.authUserInfo && req.authUserInfo.edrpou;
  }

  /**
   * Get request access info.
   * @param {object} req HTTP request.
   * @returns {{systemId, userId, userName, orgName, position, remarks}} Request user ID.
   */
  getRequestAccessInfo(req) {
    const systemId = req && req.basicAuthUser || null;
    const {
      userId = null,
      name: userName = null,
      companyName: orgName = null,
      position = null
    } = req && req.authUserInfo || {};
    return {
      systemId,
      userId,
      userName,
      orgName,
      position,
      remarks: null
    };
  }

  /**
   * Get request external user.
   * @param {object} req HTTP request.
   * @returns {string} Request external user.
   */
  getRequestExternalUser(req) {
    return req && req.basicAuthUser;
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
   * Get request user unit entities.
   * @param {object} req HTTP request.
   * @returns {{head: UnitEntity[], member: UnitEntity[], all: UnitEntity[]}} Unit entities.
   */
  getRequestUserUnitEntities(req) {
    return req && req.authUserUnitEntities;
  }

  /**
   * Get request user units.
   * @param {object} req HTTP request.
   * @returns {{head: string[], member: string[], all: string[]}} Unit names.
   */
  getRequestUserUnits(req) {
    const units = this.getRequestUserUnitEntities(req);
    const { head, member, all } = units;
    return {
      head: head.map(v => v.name),
      member: member.map(v => v.name),
      all: all.map(v => v.name)
    };
  }

  /**
   * Get request user unit IDs.
   * @param {object} req HTTP request.
   * @returns {{head: number[], member: number[], all: number[]}} Unit IDs.
   */
  getRequestUserUnitIds(req) {
    const units = this.getRequestUserUnitEntities(req) || {};
    const { head = [], member = [], all = [] } = units;
    return {
      head: head.map(v => v.id),
      member: member.map(v => v.id),
      all: all.map(v => v.id)
    };
  }

  /**
   * Get request user unit head.
   * @param {object} req HTTP request.
   * @param {number} unitId Unit ID.
   * @returns {boolean} Is request user unit head indicator.
   */
  isRequestUserUnitHead(req, unitId) {
    const { head: headUnitIds = [] } = this.getRequestUserUnitIds(req);
    return headUnitIds.includes(unitId);
  }

  /**
   * Get request user unit member.
   * @param {object} req HTTP request.
   * @param {number} unitId Unit ID.
   * @returns {boolean} Is request user unit member indicator.
   */
  isRequestUserUnitMember(req, unitId) {
    const { member: memberUnitIds = [] } = this.getRequestUserUnitIds(req);
    return memberUnitIds.includes(unitId);
  }


  /**
   * Get request user unit allow tokens.
   * @param {object} req HTTP request.
   * @returns {{allowTokens: string[]}} Allow Tokens.
   */
  getRequestUserUnitAllowTokens(req) {
    const units = this.getRequestUserUnitEntities(req);
    const { all } = units;
    const ipn = this.getRequestUserIpn(req);
    const edrpou = this.getRequestUserEdrpou(req);

    return [...new Set(_.flattenDeep(all.map(v => v.allowTokens))), `rnokpp:${ipn}`, `edrpou:${edrpou}`];
  }

  /**
   * Get request user EDS.
   * @param {object} req HTTP request.
   * @returns {string}
   */
  getRequestUserEds(req) {
    return req && req.authUserInfo && req.authUserInfo.services && req.authUserInfo.services.eds;
  }

  /**
   * Get request user EDS PEM.
   * @param {object} req HTTP request.
   * @returns {string}
   */
  getRequestUserEdsPem(req) {
    return (
      req &&
      req.authUserInfo &&
      req.authUserInfo.services &&
      req.authUserInfo.services.eds &&
      req.authUserInfo.services.eds.data &&
      req.authUserInfo.services.eds.data.pem
    );
  }

  /**
   * Get request user access token.
   * @param {object} req HTTP request.
   * @returns {string}
   */
  getRequestUserAccessToken(req) {
    return req && req.authAccessToken;
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
   * Check user signature could be mock.
   * @private
   * @param {string} token Token from auth header.
   * @returns {boolean}
   */
  isUserSignatureCouldBeMock(token) {
    return this.config.auth.allowedTestSign && this.config.test_users?.list?.some(user => user.token === token);
  }

  /**
   * Check user pem could be mock.
   * @private
   * @param {string} token Token from auth header.
   * @returns {boolean}
   */
  isUserPemCouldBeMock(token) {
    return this.config.auth.allowedTestPem && this.config.test_users?.list?.some(user => user.token === token);
  }

  /**
   * Convert Undescore keys to CamelCase.
   * @param {object} data Data object.
   * @returns {object}
   */
  convertUnderscoreKeysToCamelCase(data) {
    const mapKeysDeep = (obj, cb) => _.mapValues(_.mapKeys(obj, cb), val => (_.isObject(val) ? mapKeysDeep(val, cb) : val));

    return mapKeysDeep(data, (value, key) => {
      return _.camelCase(key);
    });
  }

  /**
   * Transform to base64 with hash.
   * @param {any} data Data.
   * @param {'md5'} [hash] Hash.
   * @returns {string} Transformed data string.
   */
  transformToBase64WithHash(data, hash = 'md5') {
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : `${data}`;
    const dataStrBase64 = Buffer.from(dataStr, 'utf8').toString('base64');
    const md5 = crypto.createHash(hash).update(dataStr).digest('base64');
    return `${md5}.${dataStrBase64}`;
  }

  /**
   * @param {string} route
   * @returns boolean
   */
  writeResponseObjectToLog(route) {
    const rules = config.log.skipLoggingRoutesList;

    if (!rules || typeof route !== 'string') return true;

    const skipByRules = rules.some(rule => route.match(rule.pattern) !== null);
    const logByConfig = config.log.responsesData && config.log.responsesData === true;

    return logByConfig && !skipByRules;
  }

  /**
   * Append trace meta.
   * @param {object} meta Meta object to append.
   */
  appendTraceMeta(meta) {
    appendTraceMeta(meta);
  }

  /**
   * Get trace meta.
   * @returns {{workflowId, taskId, documentId}} Trace meta object.
   */
  getTraceMeta() {
    return getTraceMeta() || {};
  }

  /**
   * Get trace ID.
   * @returns {string} Trace ID.
   */
  getTraceId() {
    return getTraceId() || null;
  }

  /**
   * Get request meta.
   * @param {object} req HTTP request.
   * @returns {{method, url, userAgent, userIp: {remoteAddress, xForwardedFor}, requestId}} Response meta.
   */
  getRequestMeta(req) {
    return req.requestMeta;
  }

  /**
   * Method handler
   *  - timer handling
   *  - getting params
   *  - running necessary method
   *  - logging
   *  - catching errors
   * @param {string} methodName Method name.
   */
  methodHandler(methodName) {
    return async (req, res) => {
      const [params, query] = ['params', 'query'].map(locations => matchedData(req, { locations }));

      const userId = this.getRequestUserId && this.getRequestUserId(req);
      const userUnitIds = this.getRequestUserUnitIds && this.getRequestUserUnitIds(req);

      try {
        const result = await this[methodName]({ params, query, userId, userUnitIds });
        this.responseData(res, result);
      } catch (error) {
        return this.responseError(res, error);
      }
    };
  }


}

module.exports = Controller;


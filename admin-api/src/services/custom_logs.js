const redis = require('redis');

// eslint-disable-next-line no-unused-vars
const _ = require('lodash');
// eslint-disable-next-line no-unused-vars
const moment = require('moment');

const CustomLogEntity = require('../entities/custom_log');
const Sandbox = require('../lib/sandbox');

/**
 * Custom logs.
 * @typedef {import('../entities/custom_log_template')} CustomLogTemplateEntity
 */
class CustomLogs {
  /**
   * Custom logs constructor.
   * @param {object} [config] Document update log config. Global config `custom_logs` used by default.
   */
  constructor(config = global.config.custom_logs) {
    // Singleton.
    if (!CustomLogs.singleton) {
      // Save params.
      const { cacheEnabled, redis: { host, port, ttl } = {} } = config;
      this.cacheEnabled = !!cacheEnabled;
      this.client = (this.cacheEnabled && redis.createClient({ socket: { host, port } })) || null;
      this.ttl = ttl;
      this.sandbox = new Sandbox();
      if (this.client) {
        log.save('custom-logs-cache-initialized', { cacheEnabled, host, port });
        this.client.connect().catch(err => {
          log.save('custom-logs-cache-connection-error', {
            error: err && err.message,
          });
        });
      } else {
        log.save('custom-logs-cache-not-initialized', { cacheEnabled });
      }

      // Define singleton.
      CustomLogs.singleton = this;
    }

    // Return singleton.
    return CustomLogs.singleton;
  }

  /**
   * Save custom log.
   * @param {{operationType, request, document}} options Options.
   */
  async saveCustomLog(options) {
    // Parse options.
    const { operationType, document, unitBefore, unitAfter } = options;

    let customLogTemplates = [];
    if (document) {
      // Define document template ID.
      const { documentTemplateId } = document;

      // Get custom log templates.
      customLogTemplates = await models.customLogTemplate.getByOperationTypeAndDocumentTemplateIdWithCache(operationType, documentTemplateId);
    } else {
      customLogTemplates = await models.customLogTemplate.getByOperationType(operationType);
    }

    // Check if no need to handle.
    if (customLogTemplates.length === 0) {
      return;
    }

    // Handle.
    for (const customLogTemplate of customLogTemplates) {
      // Current custom log template.
      const { schema } = customLogTemplate;

      // Main params.
      const mainParams = this.getCustomLogMainParams(customLogTemplate, options);

      // Custom params.
      let customParams;
      try {
        customParams = this.sandbox.evalWithArgs(schema, [{ document, unitBefore, unitAfter }]); // Returns `{ type, custom: { someProperty: { name, value }, ... } }`.
        log.save('custom-log-params-calculation-result', { schema, customParams });
      } catch (error) {
        log.save('custom-log-params-calculation-error', { error: error && error.message, schema, document, unitBefore, unitAfter });
      }

      // Do not save if custom params equals `null`.
      if (customParams === null) {
        continue;
      }

      // Save custom log.
      const logParams = { ...mainParams, ...customParams };
      // Check cache exist. Do not save custom log in this case.
      if (this.cacheEnabled) {
        const cacheExist = await this.isCacheExist(logParams);
        if (cacheExist) {
          log.save('custom-log-not-created-accordance-to-cache', { logParams });
          return;
        }
      }

      // Create custom log.
      const customLog = await models.customLog.create(logParams);
      log.save('custom-log-created', { customLogId: (customLog && customLog.id) || null });

      // Save to cache.
      if (this.cacheEnabled) {
        await this.saveToCache(logParams);
      }
    }
  }

  /**
   * Save to cache.
   * @param {CustomLogEntity} logParams Log params.
   */
  async saveToCache(logParams) {
    // Save data to cache.
    const cacheKey = CustomLogEntity.getCacheKey(logParams);
    const dataString = JSON.stringify(logParams);
    await this.client.set(cacheKey, dataString, { EX: this.ttl });
  }

  /**
   * Is cache exist.
   * @param {CustomLogEntity} logParams Log params.
   * @returns {boolean} Is cache exist indicator promise.
   */
  async isCacheExist(logParams) {
    // Get data from cache.
    const cacheKey = CustomLogEntity.getCacheKey(logParams);
    const dataString = await this.client.get(cacheKey);

    // Return cache exist indicator.
    return !!dataString;
  }

  /**
   * Get custom log main params.
   * @private
   * @param {CustomLogTemplateEntity} customLogTemplate Custom log template.
   * @param {{operationType, request, document}} options Options.
   */
  getCustomLogMainParams(customLogTemplate, options) {
    // Parse options.
    const { request, document } = options;

    // Prepare main params.
    const customLogTemplateId = customLogTemplate.id;
    const name = customLogTemplate.name;
    const documentId = document && document.id;
    const { requestId, method, url, uriPattern, userIp, userAgent, user } = request || {};
    const { remoteAddress, xForwardedFor } = userIp;
    const ip = [...new Set([remoteAddress, ...(xForwardedFor || '').split(',')].filter((v) => !!v).map((v) => v.trim()))];
    const { id: userId, name: userName } = user || {};

    // Return main params.
    const mainParams = {
      customLogTemplateId,
      name,
      documentId,
      requestId,
      method,
      url,
      uriPattern,
      ip,
      userAgent,
      userId,
      userName,
    };
    return mainParams;
  }
}

module.exports = CustomLogs;

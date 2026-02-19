
const redis = require('redis');

const CustomLogEntity = require('../../entities/custom_log');
const Sandbox = require('../../lib/sandbox');

/**
 * Custom logs.
 * @typedef {import('../../entities/custom_log_template')} CustomLogTemplateEntity
 */
class CustomLogs {
  /**
   * Custom logs constructor.
   * @param {object} [config] Document update log config. Global config `custom_logs` used by default.
   * @param {object} [redisConfig] Redis config. Global config `redis` used by default.
   */
  constructor(config = global.config.custom_logs, redisConfig= global.config.redis) {
    // Singleton.
    if (!CustomLogs.singleton) {
      // Save params.
      // Redis config.
      const { isEnabled: isRedisEnabled, host, port } = redisConfig || {};

      // Custom log config.
      const { cacheEnabled, redis: { ttl } } = config;
      this.cacheEnabled = (isRedisEnabled && cacheEnabled);
      this.client = this.cacheEnabled && redis.createClient(port, host) || null;

      this.ttl = ttl;
      if (this.client) { log.save('custom-logs-cache-initialized', { cacheEnabled, host, port }); } else { log.save('custom-logs-cache-not-initialized', { cacheEnabled }); }

      this.sandbox = new Sandbox();

      // Define singleton.
      CustomLogs.singleton = this;
    }

    // Return singleton.
    return CustomLogs.singleton;
  }

  /**
   * Save custom log.
   * @param {{operationType, request, document, workflowId, unitBefore, unitAfter, performerUsers, performerUserNames, performerUnits, requiredPerformerUnits, requestBody, task}} options Options.
   */
  async saveCustomLog(options) {
    // Parse options.
    const {
      operationType,
      document,
      unitBefore,
      unitAfter,
      workflowId,
      performerUsers,
      performerUserNames,
      performerUnits,
      requiredPerformerUnits,
      requestBody,
      task
    } = options;

    let customLogTemplates;
    if (document || task) {
      // Define document template ID or task template ID.
      const { documentTemplateId } = document || {};
      const { taskTemplateId } = task || {};

      // Get custom log templates.
      customLogTemplates = await models.customLogTemplate
        .getByOperationTypeAndDocumentTemplateIdWithCache(operationType, documentTemplateId || taskTemplateId);
    } else {
      customLogTemplates = await models.customLogTemplate.getByOperationType(operationType);
    }

    // Handle.
    for (const customLogTemplate of customLogTemplates) {
      // Current custom log template.
      const { schema, isGetWorkflowData } = customLogTemplate;

      let documents;
      let events;

      // TODO: Execute this outside of the loop.
      if (isGetWorkflowData && workflowId) {
        documents = await models.task.getDocumentsByWorkflowId(workflowId);
        events = await models.event.getEventsByWorkflowId(workflowId);
      }

      // Main params.
      const mainParams = this.getCustomLogMainParams(customLogTemplate, options);

      // Custom params.
      let customParams;
      try {
        // Returns `{ type, custom: { someProperty: { name, value }, ... } }`.
        customParams = this.sandbox.evalWithArgs(
          schema,
          [{
            document, unitBefore, unitAfter, documents, events,
            performerUsers, performerUserNames, performerUnits, requiredPerformerUnits,
            requestBody,
            userIp: mainParams.userIp
          }],
          { meta: { fn: 'saveCustomLog.customLogTemplate.schema', workflowId, documentId: document.id } },
        );

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
      log.save('custom-log-created', { customLogId: customLog && customLog.id || null });

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
    this.client.set(cacheKey, dataString, 'EX', this.ttl);
  }

  /**
   * Is cache exist.
   * @param {CustomLogEntity} logParams Log params.
   * @returns {boolean} Is cache exist indicator promise.
   */
  async isCacheExist(logParams) {
    // Get data from cache.
    const cacheKey = CustomLogEntity.getCacheKey(logParams);
    const dataString = await new Promise((resolve, reject) => {
      this.client.get(cacheKey, (error, value) => {
        if (error) return reject(error);
        resolve(value);
      });
    });

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
    const {
      request,
      document
    } = options;

    // Prepare main params.
    const customLogTemplateId = customLogTemplate.id;
    const name = customLogTemplate.name;
    const documentId = document && document.id;
    const { requestId, method, url, uriPattern, userIp, userAgent, user } = request || {};
    const { remoteAddress, xForwardedFor } = userIp || {};
    const ip = [...new Set([remoteAddress, ...((xForwardedFor || '').split(','))].filter(v => !!v).map(v => v.trim()))];
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
      userIp: xForwardedFor
    };
    return mainParams;
  }
}

module.exports = CustomLogs;

import { createClient } from 'redis';

import { CustomLogEntity } from '../../entities/custom_log';
import { Sandbox } from '@liquio/back-core';

/**
 * Custom logs.
 * @typedef {import('../../entities/custom_log_template')} CustomLogTemplateEntity
 */
export class CustomLogs {
  static singleton: CustomLogs;

  sandbox: Sandbox;
  cacheEnabled: any;
  client: any;
  ttl: any;

  /**
   * Custom logs constructor.
   * @param {object} [config] Document update log config. Global config `custom_logs` used by default.
   * @param {object} [redisConfig] Redis config. Global config `redis` used by default.
   */
  constructor(config: any = global.config.custom_logs, redisConfig: any = global.config.redis) {
    // Singleton.
    if (!CustomLogs.singleton) {
      // Save params.
      // Redis config.
      this.sandbox = Sandbox.getInstance();
      const { isEnabled: isRedisEnabled, host, port } = redisConfig || {};

      // Custom log config.
      const {
        cacheEnabled,
        redis: { ttl },
      } = config;
      this.cacheEnabled = isRedisEnabled && cacheEnabled;
      this.client = (this.cacheEnabled && (createClient as any)(port, host)) || null;

      this.ttl = ttl;
      if (this.client) {
        global.log.save('custom-logs-cache-initialized', { cacheEnabled, host, port });
      } else {
        global.log.save('custom-logs-cache-not-initialized', { cacheEnabled });
      }

      // Define singleton.
      CustomLogs.singleton = this;
    }

    // Return singleton.
    return CustomLogs.singleton;
  }

  /**
   * Save custom log.
   * @param {{operationType, request, event, workflowId}} options Options.
   */
  async saveCustomLog(options: any): Promise<void> {
    // Parse options.
    const { operationType, event, workflowId } = options;

    let customLogTemplates;
    if (event) {
      // Define event template ID.
      const { eventTemplateId } = event;

      // Get custom log templates.
      customLogTemplates = await global.models.customLogTemplate.getByOperationTypeAndEventTemplateIdWithCache(operationType, eventTemplateId);
    } else {
      customLogTemplates = await global.models.customLogTemplate.getByOperationType(operationType);
    }

    // Handle.
    for (const customLogTemplate of customLogTemplates) {
      // Current custom log template.
      const { schema, isGetWorkflowData } = customLogTemplate;

      let documents;
      let events;
      if (isGetWorkflowData && workflowId) {
        documents = await global.models.task.getDocumentsByWorkflowId(workflowId);
        events = await global.models.event.getEventsByWorkflowId(workflowId);
      }

      // Main params.
      const mainParams = this.getCustomLogMainParams(customLogTemplate, options);

      // Custom params.
      let customParams;
      try {
        customParams = this.sandbox.evalWithArgs(schema, [{ event, documents, events }], {
          meta: { fn: 'schema', caller: 'CustomLogs.saveCustomLog' },
        }); // Returns `{ type, custom: { someProperty: { name, value }, ... } }`.
        global.log.save('custom-log-params-calculation-result', { schema, customParams });
      } catch (error: any) {
        global.log.save('custom-log-params-calculation-error', { error: error && error.message, schema, event });
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
          global.log.save('custom-log-not-created-accordance-to-cache', { logParams });
          return;
        }
      }

      // Create custom log.
      const customLog = await global.models.customLog.create(logParams);
      global.log.save('custom-log-created', { customLogId: (customLog && customLog.id) || null });

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
  async saveToCache(logParams: any): Promise<void> {
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
  async isCacheExist(logParams: any): Promise<boolean> {
    // Get data from cache.
    const cacheKey = CustomLogEntity.getCacheKey(logParams);
    const dataString = await new Promise((resolve, reject) => {
      this.client.get(cacheKey, (error: any, value: any) => {
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
   * @param {{operationType, request, event}} options Options.
   */
  getCustomLogMainParams(customLogTemplate: any, options: any): any {
    // Parse options.
    const { event } = options;

    // Prepare main params.
    const customLogTemplateId = customLogTemplate.id;
    const name = customLogTemplate.name;
    const eventId = event && event.id;

    // Return main params.
    const mainParams = {
      customLogTemplateId,
      name,
      eventId,
    };
    return mainParams;
  }
}


import PropByPath from 'prop-by-path';
import { createClient } from 'redis';
import { DocumentUpdateLogEntity } from '../entities/document_update_log';

/**
 * Document update log service.
 */
export class DocumentUpdateLog {
  private static singleton: DocumentUpdateLog;
  client: any;
  enabled: any;
  ttl: any;

  /**
   * Document update log service constructor.
   * @param {object} [config] Document update log config. Global config `document_update_log` used by default.
   * @param {object} [redisConfig] Redis config. Global config `redis` used by default.
   */
  constructor(config = global.config.document_update_log, redisConfig = global.config.redis) {
    // Singleton.
    if (!DocumentUpdateLog.singleton) {
      // Define params.
      // Redis config.
      const { isEnabled: isRedisEnabled, host, port } = redisConfig || {};

      // Document updated log config.
      const { enabled, redis: { ttl } } = config || { redis: { ttl: 60 } };
      this.enabled = (isRedisEnabled && enabled);
      this.client = this.enabled && createClient({ socket: { host, port } }) || null;
      this.client?.connect().catch(error => {
        global.log.save('document-update-log-connection-error', error, 'error');
      });
      this.ttl = ttl;
      if (this.client) { global.log.save('document-update-log-initialized', { enabled, host, port }); } else { global.log.save('document-update-log-not-initialized', { enabled }); }

      // Define singleton.
      DocumentUpdateLog.singleton = this;
    }

    // Return singleton.
    return DocumentUpdateLog.singleton;
  }

  /**
   * Handle document update.
   * @param {object} updatedDocument Updated document entity.
   * @param {{path, value}[]} properties Updated properties.
   * @param {string} userId User ID.
   * @param {string} [lastUpdateLogId] Last lupdate log ID.
   * @returns {Promise<DocumentUpdateLogEntity[]>} Document update log entities promise.
   */
  async handleDocumentUpdate(updatedDocument, properties, userId, lastUpdateLogId) {
    // Check if document update log service disabled.
    if (!this.enabled) { return undefined; }

    // Create update log entity.
    const createdAt = new Date(updatedDocument.updatedAt);
    const documentId = updatedDocument.id;
    const changes = properties.map(v => ({ path: v.path, value: PropByPath.get(updatedDocument.data, v.path) }));
    const documentUpdateLogEntity = new DocumentUpdateLogEntity({ documentId, createdAt, userId, changes });

    // Save update log entity. Return if last update log ID not defined.
    await this.set(documentUpdateLogEntity);
    if (!lastUpdateLogId) { return [documentUpdateLogEntity]; }

    // Define and return update logs entities.
    const fromDate = new Date(parseInt(lastUpdateLogId.split('.')[3]));
    const documentUpdateLogEntities = await this.getByDocumentId(documentId, fromDate);
    return documentUpdateLogEntities;
  }

  /**
   * Get by document ID.
   * @private
   * @param {string} documentId Document ID.
   * @param {Date} [fromDate] From date.
   * @returns {Promise<DocumentUpdateLogEntity[]>} Document update log entities list (sorted from new) promise.
   */
  async getByDocumentId(documentId, fromDate) {
    // Get document update log IDs.
    const idsSearchPattern = DocumentUpdateLogEntity.getIdSearchPattern(documentId);
    const documentUpdateLogIds = await this.client.keys(idsSearchPattern);
    const documentUpdateLogIdsToGet = fromDate
      ? documentUpdateLogIds.filter(v => new Date(parseInt(v.split('.')[3])) >= new Date(fromDate))
      : documentUpdateLogIds;

    // Get by IDs list. Sorted from new logs.
    let foundDocumentUpdateLogEntities = [];
    for (const documentUpdateLogId of documentUpdateLogIdsToGet) {
      const foundDocumentUpdateLogEntity = await this.findByDocumentUpdateLogId(documentUpdateLogId);
      foundDocumentUpdateLogEntities.push(foundDocumentUpdateLogEntity);
    }
    foundDocumentUpdateLogEntities = foundDocumentUpdateLogEntities.sort((a, b) => b.createdAt - a.createdAt);

    // Return as array.
    return foundDocumentUpdateLogEntities;
  }

  /**
   * Find by document update log ID.
   * @private
   * @param {string} documentUpdateLogId Document update log ID.
   * @returns {Promise<DocumentUpdateLogEntity>} Document update log entity promise.
   */
  async findByDocumentUpdateLogId(documentUpdateLogId) {
    // Find as string.
    const dataString = await this.client.get(documentUpdateLogId);

    // Return data as object.
    const data = dataString && JSON.parse(dataString);
    const foundDocumentUpdateLogEntity = new DocumentUpdateLogEntity(data);
    return foundDocumentUpdateLogEntity;
  }

  /**
   * Set.
   * @private
   * @param {DocumentUpdateLogEntity} documentUpdateLogEntity Document update log entity.
   */
  async set(documentUpdateLogEntity) {
    // Check.
    if (!(documentUpdateLogEntity instanceof DocumentUpdateLogEntity)) {
      throw new Error('Wrong document update log entity type.');
    }

    // Set data as string with TTL.
    const dataString = JSON.stringify(documentUpdateLogEntity);
    await this.client.set(documentUpdateLogEntity.id, dataString, { EX: this.ttl });
  }
}


const crypto = require('crypto');

const Entity = require('./entity');

/**
 * Custom log entity.
 */
class CustomLogEntity extends Entity {
  /**
   * Custom log entity constructor.
   * @param {object} options Custom log object.
   * @param {string} options.id ID.
   * @param {number} [options.customLogTemplateId] Custom log template ID.
   * @param {string} options.name Name. Sample: `Подача звіту до НАЗК`.
   * @param {string} options.type Type. Sample: `Відкриття документу на читання`.
   * @param {string} [options.documentId] Document ID.
   * @param {string} [options.requestId] Request ID.
   * @param {string} [options.method] Request method.
   * @param {string} [options.url] Request URL.
   * @param {string} [options.uriPattern] Request URI pattern.
   * @param {string[]} [options.ip] Request IP.
   * @param {string} [options.userAgent] Request user agent.
   * @param {string} [options.userId] Request user ID.
   * @param {string} [options.userName] Request user name.
   * @param {object} options.custom Custon fields. Sample: `{ someProperty: { name, value }, ... }`.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({
    id,
    customLogTemplateId,
    name,
    type,
    documentId,
    requestId,
    method,
    url,
    uriPattern,
    ip,
    userAgent,
    userId,
    userName,
    custom,
    createdAt,
    updatedAt,
  }) {
    super();

    this.id = id;
    this.customLogTemplateId = customLogTemplateId;
    this.name = name;
    this.type = type;
    this.documentId = documentId;
    this.requestId = requestId;
    this.method = method;
    this.url = url;
    this.uriPattern = uriPattern;
    this.ip = ip;
    this.userAgent = userAgent;
    this.userId = userId;
    this.userName = userName;
    this.custom = custom;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Get cache key.
   * Cache key format: `l.<customLogTemplateId>.<userId>.<hash>`,
   * where `<hash>` has format: `sha1(<type>|<method>|<url>|<ip1>;<ip2>;...;<ipN>|<userAgent>|<documentId>)`.
   * @returns {string} Cache key.
   */
  getCacheKey() {
    // Define and return cache key.
    return CustomLogEntity.getCacheKey(this);
  }

  /**
   * Get cache key.
   * Cache key format: `l.<customLogTemplateId>.<userId>.<hash>`,
   * where `<hash>` has format: `sha1(<type>|<method>|<url>|<ip1>;<ip2>;...;<ipN>|<userAgent>|<documentId>)`.
   * @param {{customLogTemplateId, userId, type, method, url, ip, userAgent, documentId}} option Cache key options.
   * @returns {string} Cache key.
   */
  static getCacheKey({ customLogTemplateId, userId, type, method, url, ip, userAgent, documentId }) {
    // Define hash.
    const hashData = `${type}|${method}|${url}|${(ip || []).join(';')}|${userAgent}|${documentId}`;
    const hash = crypto.createHash('sha1').update(hashData).digest('hex');

    // Define and return cache key.
    const cacheKey = `l.${customLogTemplateId}.${userId}.${hash}`;
    return cacheKey;
  }
}

module.exports = CustomLogEntity;

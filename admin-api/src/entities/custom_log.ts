import crypto from 'node:crypto';

import { Entity } from './entity';

interface CustomLogEntityOptions {
  /** ID. */
  id: string;
  /** Custom log template ID. */
  customLogTemplateId?: number;
  /** Name. Sample: `Подача звіту до НАЗК`. */
  name: string;
  /** Type. Sample: `Відкриття документу на читання`. */
  type: string;
  /** Document ID. */
  documentId?: string;
  /** Request ID. */
  requestId?: string;
  /** Request method. */
  method?: string;
  /** Request URL. */
  url?: string;
  /** Request URI pattern. */
  uriPattern?: string;
  /** Request IP. */
  ip?: string[];
  /** Request user agent. */
  userAgent?: string;
  /** Request user ID. */
  userId?: string;
  /** Request user name. */
  userName?: string;
  /** Custon fields. Sample: `{ someProperty: { name, value }, ... }`. */
  custom: object;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
   * Custom log entity.
   */
export class CustomLogEntity extends Entity<CustomLogEntityOptions> {
  /**
   * Get cache key.
   * Cache key format: `l.<customLogTemplateId>.<userId>.<hash>`,
   * where `<hash>` has format: `sha1(<type>|<method>|<url>|<ip1>;<ip2>;...;<ipN>|<userAgent>|<documentId>)`.
   * @returns {string} Cache key.
   */
  getCacheKey() {
    // Define and return cache key.
    return CustomLogEntity.getCacheKey(this as unknown as CustomLogEntityOptions);
  }

  /**
   * Get cache key.
   * Cache key format: `l.<customLogTemplateId>.<userId>.<hash>`,
   * where `<hash>` has format: `sha1(<type>|<method>|<url>|<ip1>;<ip2>;...;<ipN>|<userAgent>|<documentId>)`.
   * @param {CustomLogEntityOptions} options Cache key options.
   * @returns {string} Cache key.
   */
  static getCacheKey({ customLogTemplateId, userId, type, method, url, ip, userAgent, documentId }: CustomLogEntityOptions) {
    // Define hash.
    const hashData = `${type}|${method}|${url}|${(ip || []).join(';')}|${userAgent}|${documentId}`;
    const hash = crypto.createHash('sha1').update(hashData).digest('hex');

    // Define and return cache key.
    const cacheKey = `l.${customLogTemplateId}.${userId}.${hash}`;
    return cacheKey;
  }
}

export interface CustomLogEntity extends CustomLogEntityOptions { }

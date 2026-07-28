import Sequelize from 'sequelize';

import Model from './model';
import KeyEntity, { KeyMeta, KeyRaw, KeySchema } from '../entities/key';
import { BasicFilter, ModelItemResponse, ModelListWithMetaResponse, ModelUpdateResponse } from '../lib/interfaces';
import { PgPubSub, PubSubCallbackData } from '../lib/pgpubsub';
import { RedisClient } from '../lib/redis_client';

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

/**
 * Key model.
 */
export default class KeyModel extends Model {
  private static singleton: KeyModel;
  private cacheTtl: { [key: string]: number };

  /**
   * Constructor.
   * @param {object} config Config.
   * @param {object} options Options.
   */
  constructor(config: any = {}, options: any = {}) {
    if (!KeyModel.singleton) {
      super(config, options);

      this.model = this.db.define(
        'key',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER
          },
          register_id: {
            type: Sequelize.INTEGER,
            references: { model: 'registers', key: 'id' }
          },
          name: {
            allowNull: false,
            type: Sequelize.STRING
          },
          description: {
            allowNull: false,
            type: Sequelize.STRING
          },
          schema: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {}
          },
          parent_id: {
            type: Sequelize.INTEGER,
            references: { model: 'keys', key: 'id' }
          },
          meta: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {}
          },
          to_string: {
            allowNull: false,
            type: Sequelize.TEXT,
            default: '(record) => { return JSON.stringify(record.data); }'
          } as any,
          to_search_string: {
            type: Sequelize.TEXT,
            allowNull: false,
            default: '(record) => { return null; }'
          } as any,
          created_by: {
            allowNull: false,
            type: Sequelize.STRING
          },
          updated_by: {
            allowNull: false,
            type: Sequelize.STRING
          },
          access_mode: {
            allowNull: false,
            type: Sequelize.ENUM('full', 'read_only', 'write_only'),
            defaultValue: 'full'
          },
          to_export: {
            allowNull: false,
            type: Sequelize.TEXT,
            defaultValue: '(record) => { return null; }'
          },
          is_encrypted: {
            allowNull: false,
            defaultValue: false,
            type: Sequelize.BOOLEAN
          }
        },
        {
          tableName: 'keys',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      PgPubSub.getInstance()?.subscribe('keys_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findById: global.config?.cache?.key?.findById || DEFAULT_CACHE_TTL,
        getAll: global.config?.cache?.key?.getAll || DEFAULT_CACHE_TTL
      };

      KeyModel.singleton = this;
    }

    return KeyModel.singleton;
  }

  static getInstance(): KeyModel | undefined {
    return KeyModel.singleton;
  }

  /**
   * Get all.
   * @param {object} [options] Options.
   * @param {object} [options.filter] Filter. Sample: { register_id: 1, parent_id: 1 }.
   * @param {object} [options.offset] Offset. Sample: 0.
   * @param {object} [options.limit] Limit. Sample: 20.
   * @returns {Promise<{data: KeyEntity[], meta: {count, offset, limit}}>} Keys promise.
   */
  async getAll(options: BasicFilter = {}): Promise<ModelListWithMetaResponse<KeyEntity>> {
    // Handle options.
    const { filter, offset, limit } = {
      offset: 0,
      limit: 2,
      filter: {},
      ...options
    };
    const queryOptions = {
      order: [['created_at', 'desc']],
      where: filter,
      offset,
      limit
    };

    // DB query with caching.
    const {
      data: { count, rows: keysRaw }
    } = await RedisClient.getOrSet(['key', 'getAll', options], () => this.model.findAndCountAll(queryOptions), this.cacheTtl.getAll);

    const keysEntities = keysRaw.map((keyRaw: any) => new KeyEntity(keyRaw)) as KeyEntity[];

    // Append key signature properties.
    if (global?.config?.key_signature) {
      keysEntities.forEach((key) => (key.keySignature = global.config.key_signature[key.id]));
    }

    return { data: keysEntities, meta: { count, offset, limit } };
  }

  // Find a key by ID.
  async findById(id: number, options?: KeyFindByIdOptions): Promise<ModelItemResponse<KeyEntity> | undefined> {
    // DB query with cache.
    const { data: keyRaw } = await RedisClient.getOrSet(['key', 'findById', id, options], () => this.model.findByPk(id), this.cacheTtl.findById);

    if (!keyRaw) return;
    const keyEntity = new KeyEntity(keyRaw);

    // Append key signature properties.
    if (global?.config?.key_signature) {
      (keyEntity as any).keySignature = this.config.key_signature[keyEntity.id];
    }

    return { data: keyEntity };
  }

  async findByMetaFilters(options: KeyFindByMetaFiltersOptions): Promise<KeyEntity[] | undefined> {
    const { filters, attributes = [] } = options;
    const dbResponse = await this.model.findAll({ where: { meta: filters }, attributes });
    return dbResponse.map((el) => new KeyEntity(el));
  }

  // Create a key.
  async create({
    id,
    registerId,
    name,
    description,
    schema,
    parentId,
    meta,
    toString,
    toSearchString,
    user,
    lock,
    accessMode,
    isEncrypted,
    toExport
  }: Partial<KeyCreateOptions>): Promise<ModelItemResponse<KeyEntity>> {
    const keyToCreateRaw: KeyRaw = {
      register_id: registerId,
      name: name,
      description: description,
      schema: schema,
      parent_id: parentId,
      meta: meta,
      to_string: toString,
      to_search_string: toSearchString,
      created_by: user,
      updated_by: user,
      access_mode: accessMode,
      to_export: toExport,
      is_encrypted: !!isEncrypted
    };

    // Backwards compatibility: remove after implementation on bpmn-admin
    if (lock && !keyToCreateRaw.access_mode) {
      keyToCreateRaw.access_mode = 'read_only';
    }

    if (id) keyToCreateRaw.id = id;

    // DB query.
    const createdKeyRaw = await this.model.create(keyToCreateRaw);
    const createdKeyEntity = new KeyEntity(createdKeyRaw);

    return { data: createdKeyEntity };
  }

  // Update a key.
  async update(
    id: number,
    {
      registerId,
      name,
      description,
      schema,
      parentId,
      meta,
      toString,
      toSearchString,
      user,
      lock,
      accessMode,
      toExport,
      isEncrypted
    }: Partial<KeyUpdateOptions>
  ): Promise<ModelUpdateResponse<KeyEntity>> {
    const keyToUpdateRaw = this.removeUndefinedProperties({
      register_id: registerId,
      name: name,
      description: description,
      schema: schema,
      parent_id: parentId,
      meta: meta,
      to_string: toString,
      to_search_string: toSearchString,
      updated_by: user,
      access_mode: accessMode,
      to_export: toExport,
      is_encrypted: isEncrypted
    }) as KeyRaw;

    // Backwards compatibility: remove after implementation on bpmn-admin
    if (lock && !keyToUpdateRaw.access_mode) {
      keyToUpdateRaw.access_mode = 'read_only';
    }

    // DB query.
    const [updatedRowsCount, [updatedKeyRaw]] = await this.model.update(keyToUpdateRaw, { where: { id }, returning: true });
    const updatedKeyEntity = new KeyEntity(updatedKeyRaw);

    return {
      data: updatedKeyEntity,
      updating: { rowsCount: updatedRowsCount }
    };
  }

  // Delete a key.
  async delete(id: number): Promise<KeyDeleteResult> {
    // DB query.
    const deletedRowsCount = await this.model.destroy({ where: { id } });

    return { data: deletedRowsCount };
  }

  // Query keys with elastic afterhandler metadata by their IDs.
  async findSynced(ids: number[]): Promise<KeyFindSyncedResult | undefined> {
    if (!Array.isArray(ids)) return;

    return this.model.sequelize.query(
      `
        with synced as (
          select r.key_id,
            count(1)
          from records r
          where
          id in (
              select distinct h.record_id
              from history h,
                afterhandlers a
              where a.history_id = h.id
              and a."synced" = false
              and a."type" = 'elastic'
            )
          group by r.key_id
        ),
        allrecords as (
          select r2.key_id,
            count(*) as "count"
          from records r2
          group by r2.key_id
        ),
        errors as (
          select distinct on (r.key_id)
            r.id as "record_id",
            r.key_id,
            a.error_message
          from records r,
            history h,
            afterhandlers a
          where h.record_id = r.id
            and a.has_error = true
            and a.history_id = h.id
            and h.key_id in (:ids)
            and a.error_message not in ('Wrong operation type.', 'Already exists.')
          order by r.key_id, a.created_at desc
        )
        select
          k.id as "key_id",
          k.meta::jsonb->'afterhandlers' ? 'elastic' as "is_elastic_active",
          coalesce(s."count", 0) as "queue_length",
          coalesce(ar."count", 0) as "total",
          e.error_message as "status_message",
          e.record_id as "errored_record_id"
        from keys k
          left join synced s on k.id = s.key_id
          left join allrecords ar on k.id = ar.key_id
          left join errors e on k.id = e.key_id
          left join registers r3 on k.register_id = r3.id
        where k.id in (:ids);
      `,
      { replacements: { ids }, type: Sequelize.QueryTypes.SELECT }
    );
  }

  // Query all keys with elastic afterhandler metadata.
  async allSynced(): Promise<KeyAllSyncedResult> {
    return this.model.sequelize.query(
      `
        with synced as (
          select r.key_id,
            count(1)
          from records r
          where id in (
            select distinct h.record_id
            from history h,
              afterhandlers a
            where a.history_id = h.id
            and a."synced" = false
            and a."type" = 'elastic'
            )
          group by r.key_id
        ),
        allrecords as (
          select r2.key_id,
            count(*) as "count"
          from records r2
          group by r2.key_id
        ),
        errors as (
          select distinct on (r.key_id)
            r.id as "record_id",
            r.key_id,
            a.error_message
          from records r,
            history h,
            afterhandlers a
          where h.record_id = r.id
            and a.history_id = h.id
            and a.has_error = true
            and a.error_message not in ('Wrong operation type.', 'Already exists.')
          order by r.key_id, a.created_at desc
        )
        select k.id as "key_id",
          k.name as "key_name",
          r3.id as "register_id",
          r3.name as "register_name",
          coalesce(s."count", 0) as "queue_length",
          coalesce(ar."count", 0) as "count",
          e.error_message as "status_message",
          e.record_id as "errored_record_id"
        from keys k
          left join synced s on k.id = s.key_id
          left join allrecords ar on k.id = ar.key_id
          left join errors e on k.id = e.key_id
          left join registers r3 on k.register_id = r3.id
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );
  }

  checkRecordsReadable(key: KeyEntity): boolean {
    if (key?.accessMode !== undefined) {
      return key.accessMode === 'write_only' ? false : true;
    } else {
      return false;
    }
  }

  async checkRecordsReadableById(keyId: number): Promise<boolean> {
    const modelResponse = await this.findById(keyId);
    if (!modelResponse) return false;
    const { data: key } = modelResponse;
    return this.checkRecordsReadable(key);
  }

  checkRecordsWritable(key: KeyEntity): boolean {
    if (key?.accessMode !== undefined) {
      return key.accessMode === 'read_only' ? false : true;
    } else {
      return false;
    }
  }

  async checkRecordsWritableById(keyId: number): Promise<boolean> {
    const modelResponse = await this.findById(keyId);
    if (!modelResponse) return false;
    const { data: key } = modelResponse;
    return this.checkRecordsWritable(key);
  }

  async findUnfinishedEncryption() {
    // Wake up the model
    await this.model.findOne();

    const results = await this.model.sequelize.query(
      `SELECT k.id
        FROM keys k
        JOIN records r ON k.id = r.key_id
        WHERE k.is_encrypted <> r.is_encrypted
        GROUP BY k.id`,
      { type: Sequelize.QueryTypes.SELECT, raw: true }
    );

    return results.map((result) => result.id);
  }

  /**
   * Event handler for row change.
   */
  private async onRowChange(channel: string, { id }: PubSubCallbackData) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.deleteMany(['key', 'getAll', '*']);
      redis.delete(['key', 'findById', id]);
      redis.deleteMany(['key', 'findById', id, '*']);
    }
  }
}

export interface KeyFindByIdOptions {
  cacheTime: number;
}
export interface KeyFindByMetaFiltersOptions {
  filters: any;
  attributes: string[];
}
export interface KeyCreateOptions {
  id: number;
  registerId: number;
  name: string;
  description: string;
  schema: KeySchema;
  parentId: number;
  meta: KeyMeta;
  toString: string;
  toSearchString: string;
  user: string;
  lock?: boolean;
  accessMode: 'full' | 'read_only' | 'write_only';
  isEncrypted: boolean;
  toExport: string;
}

export interface KeyUpdateOptions {
  registerId: number;
  name: string;
  description: string;
  schema: KeySchema;
  parentId: number;
  meta: KeyMeta;
  toString: string;
  toSearchString: string;
  user: string;
  lock?: boolean;
  accessMode: 'full' | 'read_only' | 'write_only';
  toExport: string;
  isEncrypted: boolean;
}

export interface KeyDeleteResult {
  // Number of deleted records.
  data: number;
}

export interface KeyFindSyncedResult {
  key_id: number;
  queue_length: number;
  total: number;
  status_message?: string;
  errored_record_id?: number;
}

export interface KeyAllSyncedResult {
  key_id: number;
  key_name: string;
  register_id: number;
  register_name: string;
  queue_length: number;
  count: number;
  status_message?: string;
  errored_record_id?: number;
}

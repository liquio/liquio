import objectPath from 'object-path';
import Sequelize, { FindAndCountOptions } from 'sequelize';

import Model from './model';
import RecordEntity from '../entities/record';
import deepFind from '../lib/deepFind';
import HistoryModel from './history';
import { BasicFilter, ModelListResponse, ModelListWithMetaResponse, ModelItemResponse, ModelUpdateResponse } from '../lib/interfaces';

const ERROR_ORDER_FIELD_VALIDATION = 'Order field path is not valid.';
const DB_FIELD_NAME_REGEX = '[a-zA-Z0-9_-]+';
const ENCRYPTED_FIELD_NAME = '$encrypted';

/**
 * Record model.
 */
export default class RecordModel extends Model {
  private static singleton: RecordModel;
  public historyModel: HistoryModel;

  /**
   * Constructor.
   * @param {object} config Config.
   * @param {object} options Options.
   */
  constructor(config: any, options: any) {
    if (!RecordModel.singleton) {
      super(config, options);

      this.model = this.db.define(
        'record',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1
          },
          register_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'registers', key: 'id' }
          },
          key_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'keys', key: 'id' }
          },
          data: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {},
            get() {
              const rawData = this.getDataValue('data');
              if (rawData && rawData[ENCRYPTED_FIELD_NAME]) {
                try {
                  return JSON.parse(global.encryption.decrypt(rawData[ENCRYPTED_FIELD_NAME]));
                } catch {
                  return rawData;
                }
              } else {
                return rawData;
              }
            }
          },
          meta: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {}
          },
          allow_tokens: {
            allowNull: false,
            type: Sequelize.ARRAY(Sequelize.STRING),
            defaultValue: []
          },
          search_string: {
            type: Sequelize.STRING
          },
          search_string_2: {
            type: Sequelize.STRING
          },
          search_string_3: {
            type: Sequelize.STRING
          },
          signature: {
            allowNull: true,
            type: Sequelize.TEXT
          },
          is_encrypted: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false
          },
          created_by: {
            allowNull: false,
            type: Sequelize.STRING
          },
          updated_by: {
            allowNull: false,
            type: Sequelize.STRING
          }
        },
        {
          tableName: 'records',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
          hooks: {
            beforeSave: (record: any) => {
              if (record.is_encrypted && record.data && !record.data[ENCRYPTED_FIELD_NAME]) {
                try {
                  const encryptedData = global.encryption.encrypt(JSON.stringify(record.data));
                  record.data = { [ENCRYPTED_FIELD_NAME]: encryptedData };
                } catch {
                  // Do nothing to prevent saving record with invalid data
                }
              }
            }
          }
        }
      );
      RecordModel.singleton = this;
    }

    return RecordModel.singleton;
  }

  static getInstance(): RecordModel | undefined {
    return RecordModel.singleton;
  }

  // Get all records.
  async getAll(options: BasicFilter & { changedFrom?: string; changedTo?: string } = {}): Promise<ModelListWithMetaResponse<RecordEntity>> {
    // Handle options.
    const { filter = {}, offset, limit, sort = {}, joinBy, changedFrom, changedTo } = { offset: 0, limit: 2, ...options } as any;
    if (typeof filter.allow_tokens !== 'undefined') {
      if (filter.filters_type === 'or') {
        // OR filters type.
        filter[Sequelize.Op.and] = [
          {
            [Sequelize.Op.or]: [{ allow_tokens: { [Sequelize.Op.overlap]: [filter.allow_tokens] } }, { allow_tokens: [] }]
          }
        ];
      } else {
        // AND filters type (default).
        filter[Sequelize.Op.or] = [{ allow_tokens: { [Sequelize.Op.overlap]: [filter.allow_tokens] } }, { allow_tokens: [] }];
      }
      delete filter.allow_tokens;
    }
    if (filter.filters_type === 'or') {
      // Handle OR filetrs.
      if (!filter[Sequelize.Op.and]) {
        filter[Sequelize.Op.and] = [];
      }
      if (filter.data_like) {
        filter[Sequelize.Op.and].push({ data: filter.data_like });
        delete filter.data_like;
      }
      filter[Sequelize.Op.and].push({ [Sequelize.Op.or]: [] });
      const lastAndFilterItem = filter[Sequelize.Op.and][filter[Sequelize.Op.and].length - 1][Sequelize.Op.or];
      for (const filterDataIndex in filter.data) {
        const filterDataValues = filter.data[filterDataIndex];
        for (const filterDataValue of filterDataValues) {
          lastAndFilterItem.push({ data: { [filterDataIndex]: filterDataValue } });
        }
        delete filter.data[filterDataIndex];
      }
      delete filter.filters_type;
    }
    if (filter.data_like) {
      filter.data = { ...filter.data, ...filter.data_like };
      delete filter.data_like;
    }

    deepFind(
      filter.data,
      Array.isArray as any,
      ((value, path) => {
        objectPath.set(filter.data, path, { [Sequelize.Op.or]: value });
      }) as any
    );

    deepFind(
      filter.data,
      ((value) => value === 'null') as any,
      ((value, path) => {
        objectPath.set(filter.data, path, null);
      }) as any
    );

    let attributes, replacements, order;
    if (changedFrom || changedTo) {
      const subquery = Sequelize.literal(`(
        SELECT MAX(created_at) AS last_changed_at
        FROM history
        WHERE record_id = "record".id AND created_at BETWEEN :changedFrom AND :changedTo
        GROUP BY record_id
      )`);
      filter[Sequelize.Op.and] = filter[Sequelize.Op.and] || [];
      filter[Sequelize.Op.and].push(Sequelize.where(subquery, { [Sequelize.Op.ne]: null }));
      attributes = { include: [[subquery, 'last_changed_at']] };
      replacements = { changedFrom: changedFrom ?? new Date(), changedTo: changedTo ?? new Date() };
      order = [['last_changed_at', 'asc']];
    }

    const additionalOrder = limit <= 100 && sort !== 'null' ? [['id', 'asc']] : [];
    order = order ?? [...(await this.getSortEntriesAsArray(sort)), ...additionalOrder];

    const queryOptions: FindAndCountOptions = { order, where: filter, offset, limit, attributes, replacements };

    if (joinBy) {
      // Form where query part.
      let wherePart = '';
      for (const opt in queryOptions.where) {
        const optValue = queryOptions.where[opt];
        if (typeof optValue === 'object') {
          if (Object.keys(optValue).length === 0) continue;
          if (wherePart !== '') {
            wherePart += ' and ';
          }
          const nestedObjWherePart = this.formWhereQueryForObjects(optValue, '');
          wherePart += nestedObjWherePart ? nestedObjWherePart : '';
        } else {
          if (wherePart !== '') {
            wherePart += ' and ';
          }
          wherePart += `r1.${opt} = ${optValue}`;
        }
      }

      const createdAt = queryOptions.where?.['created_at'];
      if (createdAt) {
        const createdAtWherePart = this.formCreateUpdateDateQuery(createdAt);
        wherePart += createdAtWherePart;
      }

      // Select data with left join.
      const results = await this.model.sequelize.query(
        `
        select r1.data as data1, r2.id idr2, r2.data as data2
        from records r1
        left join records r2 on r2.id::text = r1.data->>:joinBy
        where ${wherePart} limit :limit offset :offset`,
        { type: Sequelize.QueryTypes.SELECT, replacements: { joinBy, limit: +queryOptions.limit, offset: +queryOptions.offset } }
      );

      // Count data with left join.
      const resultsCount = await this.model.sequelize.query(
        `
        select count(1)
        from records r1
        left join records r2 on r2.id::text = r1.data->>:joinBy
        where ${wherePart}`,
        { type: Sequelize.QueryTypes.SELECT, replacements: { joinBy } }
      );

      const { count } = (resultsCount && resultsCount[0]) || {};
      const response = { data: results, meta: { count, offset, limit } };
      return response;
    }

    // DB query.
    const { count, rows: recordsRaw } = await this.model.findAndCountAll(queryOptions);
    const recordsEntities = recordsRaw.map((recordRaw) => new RecordEntity(recordRaw));

    return { data: recordsEntities, meta: { count, offset, limit } };
  }

  // Search records.
  async search(keyId: string, searchKey: string, textList: string[], limit = 10, offset = 0): Promise<ModelListWithMetaResponse<RecordEntity>> {
    // Prepare DB query.
    const order = [[searchKey, 'asc']];
    const likeOperator = searchKey === 'search_string' ? Sequelize.Op.like : Sequelize.Op.iLike;
    const where = {
      key_id: keyId,
      [Sequelize.Op.and]: textList.map((v) => ({ [searchKey]: { [likeOperator]: `%${v}%` } }))
    };
    const queryOptions = { order, where, limit, offset };

    // DB query.
    const { count, rows: recordsRaw } = await this.model.findAndCountAll(queryOptions);
    const recordsEntities = recordsRaw.map((recordRaw) => new RecordEntity(recordRaw));

    return { data: recordsEntities, meta: { count, offset, limit } };
  }

  // Count all records.
  async countAll(options: BasicFilter = {}): Promise<number> {
    // Handle options.
    const { filter } = { filter: {}, ...options } as any;
    if (typeof filter.allow_tokens !== 'undefined') {
      filter[Sequelize.Op.or] = [{ allow_tokens: { [Sequelize.Op.overlap]: [filter.allow_tokens] } }, { allow_tokens: [] }];
      delete filter.allow_tokens;
    }
    const queryOptions = { where: filter };

    // DB query.
    const result = await this.model.count(queryOptions);

    // Return.
    return result;
  }

  // Find a record by ID.
  async findById(id: string): Promise<ModelItemResponse<RecordEntity>> {
    // DB query.
    const recordRaw = await this.model.findByPk(id);
    const recordEntity = new RecordEntity(recordRaw);

    return { data: recordEntity };
  }

  // Count records by JSON fields.
  async countByJsonFields(keyId: number, filters: any[], recordIdToRemove?: string): Promise<number> {
    // DB query.
    const where: any = {
      key_id: keyId,
      data: {
        [Sequelize.Op.or]: filters
      }
    };
    if (recordIdToRemove) where.id = { [Sequelize.Op.ne]: recordIdToRemove };
    const count = await this.model.count({ where });

    // Return.
    return count;
  }

  // Find records by a key ID.
  async getByKeyId(keyId: number, withSearchStrings = false, queryOptions = {}): Promise<ModelListResponse<RecordEntity>> {
    // DB query.
    const recordsRaw = await this.model.findAll({
      ...queryOptions,
      where: { key_id: keyId }
    });
    const recordEntities = recordsRaw.map((recordRaw: any) => new RecordEntity(recordRaw, withSearchStrings));

    return { data: recordEntities };
  }

  // Get paginated records by key ID.
  async getByKeyIdWithPagination(keyId: number, offset = 0, limit = 100): Promise<ModelListResponse<RecordEntity>> {
    // DB query.
    const recordsRaw = await this.model.findAll({
      where: { key_id: keyId },
      order: [
        ['created_at', 'asc'],
        ['id', 'asc']
      ],
      offset,
      limit
    });
    const recordEntities = recordsRaw.map((recordRaw) => new RecordEntity(recordRaw));

    return { data: recordEntities };
  }

  // Create a record.
  async create(
    {
      id,
      registerId,
      keyId,
      data,
      meta,
      user,
      allowTokens,
      searchString,
      searchString2,
      searchString3,
      person,
      signature,
      isEncrypted
    }: Partial<RecordCreateRaw>,
    _addToHistory = true,
    historyMeta?: any
  ): Promise<ModelItemResponse<RecordEntity>> {
    // Prepare RAW.
    const recordToCreateRaw: any = {
      register_id: registerId,
      key_id: keyId,
      data: data,
      meta: { ...(meta || {}), user, person, historyMeta },
      allow_tokens: allowTokens,
      search_string: this.normalizeSearchString(searchString),
      search_string_2: this.normalizeSearchString(searchString2),
      search_string_3: this.normalizeSearchString(searchString3),
      created_by: user,
      updated_by: user,
      signature: signature,
      is_encrypted: isEncrypted
    };

    if (id) recordToCreateRaw.id = id;

    await global.afterhandler.validateRecord(recordToCreateRaw, 'create');

    // DB query.
    const createdRecordRaw = await this.model.create(recordToCreateRaw);
    const createdRecordEntity = new RecordEntity(createdRecordRaw);

    // Create afterhandlers.
    await this.historyModel.createAfterhandlers(createdRecordEntity.id, user, keyId);

    return { data: createdRecordEntity };
  }

  // Bulk create records.
  async bulkCreate(records: RecordCreateRaw[], isReturnCreatedRecords = false, isDisableHooks = false): Promise<number | RecordEntity[]> {
    // Prepare RAW.
    const recordsToCreateRaw = records.map((record) => {
      const { id, registerId, keyId, data, meta, user, allowTokens, searchString, searchString2, searchString3, isEncrypted } = record;

      const recordToCreateRaw: any = {
        register_id: registerId,
        key_id: keyId,
        data: data,
        meta: meta,
        allow_tokens: allowTokens,
        search_string: this.normalizeSearchString(searchString),
        search_string_2: this.normalizeSearchString(searchString2),
        search_string_3: this.normalizeSearchString(searchString3),
        created_by: user,
        updated_by: user,
        is_encrypted: isEncrypted
      };

      if (id) recordToCreateRaw.id = id;
      return recordToCreateRaw;
    });

    // DB query.
    const bulkCreateRecords = await this.model.bulkCreate(recordsToCreateRaw, { individualHooks: !isDisableHooks });
    const bulkCreateRecordsCount = (Array.isArray(bulkCreateRecords) && bulkCreateRecords.length) || 0;

    // Return records count.
    return isReturnCreatedRecords ? bulkCreateRecords.map((recordRaw) => new RecordEntity(recordRaw)) : bulkCreateRecordsCount;
  }

  // Update a record
  async update(
    id: string,
    {
      registerId,
      keyId,
      data,
      meta,
      user,
      searchString,
      searchString2,
      searchString3,
      person,
      signature,
      isEncrypted,
      allowTokens
    }: Partial<RecordCreateRaw>,
    _addToHistory?: boolean,
    historyMeta?: {
      accessInfo?: { userId?: string; userName?: string };
    },
    isSkipDataUpdating: boolean = false
  ): Promise<ModelUpdateResponse<RecordEntity>> {
    // Prepare RAW.
    const recordToUpdateRaw = this.removeUndefinedProperties({
      register_id: registerId,
      key_id: keyId,
      data,
      meta: { ...(meta || {}), user, person, historyMeta },
      updated_by: user,
      search_string: this.normalizeSearchString(searchString),
      search_string_2: this.normalizeSearchString(searchString2),
      search_string_3: this.normalizeSearchString(searchString3),
      is_encrypted: isEncrypted,
      signature: signature,
      allow_tokens: allowTokens
    });

    await global.afterhandler.validateRecord(recordToUpdateRaw, 'update');

    if (isSkipDataUpdating) {
      delete recordToUpdateRaw.data; // Do not update record data. For example: it is possible that record will be updated by user at the time of indexation, and we will roll back changes.
    }

    // DB query.
    const [updatedRowsCount, [updatedRecordRaw]] = await this.model.update(recordToUpdateRaw, {
      where: { id },
      returning: true,
      individualHooks: true
    });
    const updatedRecordEntity = new RecordEntity(updatedRecordRaw);

    // Saving to history occurs through a SQL trigger.

    // Create afterhandlers.
    await this.historyModel.createAfterhandlers(updatedRecordEntity.id, user, keyId);

    return { data: updatedRecordEntity, updating: { rowsCount: updatedRowsCount } };
  }

  // Update record properties.
  async updatePatch(
    id: string,
    keyId: number,
    properties: Array<{ path: string; previousValue: any; value: any }>
  ): Promise<RecordEntity | undefined> {
    const where = isNaN(+id) ? { id } : { key_id: keyId, search_string: id.toString() };
    const record = await this.model.findOne({
      where
    });
    if (!record) return;
    const searchStrings = {
      search_string: record.search_string,
      search_string_2: record.search_string_2,
      search_string_3: record.search_string_3
    };
    for (const { path, previousValue, value } of properties) {
      // Update prop
      if (!path.includes('.')) {
        record[path] = value;
        continue;
      }
      record.set({ [path]: value });

      // Update search strings
      Object.keys(searchStrings).forEach((key) => {
        if (searchStrings[key] === previousValue.toString()) {
          record[key] = value;
        }
      });
    }

    return new RecordEntity(await record.save());
  }

  // Update a record data field.
  async updateByDataField({ keyId, registerId, record, dataFieldName, dataFieldValue }): Promise<ModelUpdateResponse<RecordEntity>> {
    // Prepare RAW.
    const recordToUpdateRaw = this.removeUndefinedProperties({
      register_id: registerId,
      key_id: keyId,
      data: record.data,
      meta: record.meta,
      updated_by: record.user,
      search_string: this.normalizeSearchString(record.searchString),
      search_string_2: this.normalizeSearchString(record.searchString2),
      search_string_3: this.normalizeSearchString(record.searchString3),
      signature: record.signature
    });

    await global.afterhandler.validateRecord(recordToUpdateRaw, 'update');

    // DB query.
    const [updatedRowsCount, [updatedRecordRaw]] = await this.model.update(recordToUpdateRaw, {
      where: { key_id: keyId, register_id: registerId, data: { [dataFieldName]: dataFieldValue } },
      returning: true,
      individualHooks: true
    });
    const updatedRecordEntity = new RecordEntity(updatedRecordRaw);

    // Create afterhandlers.
    await this.historyModel.createAfterhandlers(updatedRecordEntity.id, updatedRecordEntity.updatedBy, keyId);

    return { data: updatedRecordEntity, updating: { rowsCount: updatedRowsCount } };
  }

  // Delete a record.
  async delete(id: string, user?: string, person?: any, historyMeta?: any): Promise<{ data: number }> {
    // Find existing record that should be deleted.
    const recordToDeleteRaw = await this.findById(id);

    await global.afterhandler.validateRecord(recordToDeleteRaw, 'delete');

    const { data: recordToDeleteEntity } = recordToDeleteRaw;

    // Write meta info for correct recording to history. SQL trigger will use this info while recording information about deleting.
    const [, [updatedRecordRaw]] = await this.model.update(
      { ...recordToDeleteEntity, meta: { ...(recordToDeleteEntity.meta || ({} as any)), person, historyMeta } },
      {
        where: { id },
        returning: true,
        individualHooks: true
      }
    );
    const updatedRecordEntity = new RecordEntity(updatedRecordRaw);

    // DB query.
    const deletedRowsCount = await this.model.destroy({ where: { id } });

    // Create afterhandlers.
    await this.historyModel.createAfterhandlers(id, user || updatedRecordEntity.updatedBy, updatedRecordEntity.keyId);

    return { data: deletedRowsCount };
  }

  // Bulk delete records.
  async bulkDelete(
    filters: { [key: string]: any },
    recordsToRemove: number,
    removeCounterCb: (removedRecords: number) => void,
    user = 'system',
    person = { id: null, name: null },
    historyMeta = { accessInfo: { userId: null, userName: null } }
  ): Promise<{ removedRecords: number; nonRemovedRecords: number }> {
    // Check filters.
    if (!filters.key_id) throw new Error('Key ID is required filter for bulk delete.');

    // Find record that should be deleted.
    const recordsToDelete = await this.model.findAll({ where: filters, attributes: ['id'] });

    // Delete records.
    let removedRecords = 0;
    for (const record of recordsToDelete) {
      const { id } = record;
      await this.delete(id, user, person, historyMeta);
      removedRecords++;
      removeCounterCb(removedRecords);
    }

    // Response counters.
    const difference = recordsToRemove - removedRecords;
    return { removedRecords: removedRecords, nonRemovedRecords: difference };
  }

  // Get all records in raw format for EDESSB.
  async getAllEdessb(options: { filter: any }): Promise<any[]> {
    const { filter } = options;

    const result = await this.model.findAll({
      where: filter,
      order: [['id', 'asc']]
    });

    return result;
  }

  // Normalize search string.
  normalizeSearchString(searchString: string) {
    return searchString ? `${searchString}`.toLowerCase() : searchString;
  }

  /**
   * Build literal sort query for nested json number fields.
   * @param {Object} sort = { "data.sumGov": "asc", "created_at": "asc", ... }
   * @return {Promise<[]>} = [ { "val": "\"record\".\"data\"->'sumGov' ASC" }, [ "created_at", "asc" ], ... ]
   */
  async getSortEntriesAsArray(sort: any) {
    /** @var sortEntries = [ [ "data.sumGov", "asc" ], [ "created_at", "asc" ] , ... ]; */
    const sortEntries = sort.constructor === Object ? Object.entries(sort) : sort;

    if (sort === 'null') {
      return [];
    }

    for (const entry in sortEntries) {
      const orderFieldJsonPath = sortEntries[entry][0];
      const orderValue = sortEntries[entry][1].toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const isNestedJsonField = orderFieldJsonPath.indexOf('.') >= 0;
      if (isNestedJsonField) {
        const orderFieldJsonPathParts = orderFieldJsonPath.split('.');

        // Validate field name path
        const pathIsValid = orderFieldJsonPathParts.every((fieldName) => {
          const match = fieldName.match(DB_FIELD_NAME_REGEX);
          return match && match[0] === fieldName;
        });
        if (!pathIsValid) {
          throw new Error(ERROR_ORDER_FIELD_VALIDATION);
        }

        const databaseFieldName = orderFieldJsonPathParts.shift();

        let orderFieldSqlPrepared = `"${this.model.name}"."${databaseFieldName}"`;
        const sqlJsonPath = orderFieldJsonPathParts.map((element) => `'${element}'`).join('->');
        if (sqlJsonPath) orderFieldSqlPrepared += `->${sqlJsonPath}`;
        delete sort[orderFieldJsonPath];
        sortEntries[entry] = Sequelize.literal(orderFieldSqlPrepared + ' ' + orderValue);
      }
    }

    return sortEntries;
  }

  /**
   * @param {number} keyId Encrypt records of this key
   * @param {boolean} isEncrypted Encrypt or decrypt
   * @param {number} limit Limit of records to encrypt in one batch
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async batchEncrypt(keyId, isEncrypted, limit = 1000) {
    const transaction = await this.model.sequelize.transaction();

    let count = 0;
    try {
      const records = await this.model.findAll({
        where: { key_id: keyId, is_encrypted: !isEncrypted },
        limit,
        transaction
      });

      for (const record of records) {
        record.is_encrypted = isEncrypted;
        // Force sequelize encrypting setter to trigger
        record.data = { ...record.data };
        await record.save({ transaction });
        count++;
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return count;
  }

  /**
   * Form where query for object.
   * @param {object} obj
   * @param {string} whereQueryString
   */
  private formWhereQueryForObjects(obj, whereQueryString) {
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        whereQueryString += Object.values(obj[key]).some((v) => typeof v === 'object') ? `r1.data->'${key}'->` : `r1.data->'${key}'->>`;
        return this.formWhereQueryForObjects(obj[key], whereQueryString);
      } else {
        if (whereQueryString) {
          whereQueryString += ' and ';
        }
        whereQueryString += obj[key] === 'null' ? `r1.data->>'${key}' is ${obj[key]}` : `r1.data->>'${key}' = '${obj[key]}'`;
      }
    }
    return whereQueryString;
  }

  /**
   * Form create update at date query.
   * @param {object} dateAtClause Date clause.
   */
  private formCreateUpdateDateQuery(dateAtClause) {
    const { Op } = this.model.sequelize;
    const lessAndEqualQuery = dateAtClause[Op.lte];
    const greateAndEqualQuery = dateAtClause[Op.gte];
    let whereClauseQuery = lessAndEqualQuery ? ` and r1.created_at <= '${new Date(lessAndEqualQuery).toISOString()}'` : '';
    whereClauseQuery += greateAndEqualQuery ? ` and r1.created_at >= '${new Date(greateAndEqualQuery).toISOString()}'` : '';
    return whereClauseQuery;
  }
}

export interface RecordCreateRaw {
  id: string;
  registerId: number;
  keyId: number;
  data: any;
  meta: any;
  user: string;
  allowTokens: string[];
  searchString: string;
  searchString2: string;
  searchString3: string;
  person: any;
  signature: string;
  isEncrypted: boolean;
}

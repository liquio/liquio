import { randomBytes } from 'crypto';
import { Op } from 'sequelize';

import Business from './business';
import KeyModel from '../models/key';
import RecordModel from '../models/record';
import HistoryModel from '../models/history';

// Constants.
const AUTO_CLEAR_INTERVAL = 1000 * 60 * 60 * 24 * 7; // 1 week.
const STATUSES = {
  Rollbacking: 'Rollbacking',
  Rollbacked: 'Rollbacked',
  Failed: 'Failed'
};
const OPERATIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

/**
 * Rollback business.
 */
export default class RollbackBusiness extends Business {
  static singleton: RollbackBusiness;

  keyModel: KeyModel;
  recordModel: RecordModel;
  historyModel: HistoryModel;
  toRollback: { [key: string]: any };

  /**
   * RollbackBusiness constructor.
   * @param {object} config Config object.
   * @return {RollbackBusiness}
   */
  constructor(config) {
    // Define singleton.
    if (!RollbackBusiness.singleton) {
      super(config);
      this.keyModel = KeyModel.getInstance();
      this.recordModel = RecordModel.getInstance();
      this.historyModel = HistoryModel.getInstance();

      this.toRollback = {};
      RollbackBusiness.singleton = this;
    }
    return RollbackBusiness.singleton;
  }

  /**
   * Rollback statuses.
   * @return {STATUSES} Rollback statuses.
   * @example
   * const statuses = RollbackBusiness.Statuses;
   */
  static get Statuses() {
    return STATUSES;
  }

  /**
   * Start rollback.
   * @param {object} rollbackOptions Rollback options.
   * @param {integer} rollbackOptions.keyId KeyId to rollback.
   * @param {string} rollbackOptions.timePoint timePoint to rollback. 2023-07-20T17:15:03.183Z
   * @param {object} accessOptions Access options.
   * @param {string} [accessOptions.user='user'] User.
   * @param {{userId, userName}} [accessOptions.accessInfo] Access info.
   * @return {Promise<string>} Rollback ID promise.
   */
  async startRollback({ keyId, timePoint }, { user = 'system', accessInfo = { userId: null, userName: null } }) {
    try {
      await this.validate({ keyId, timePoint });
      this.checkPreviousRollbackProceed(keyId);
    } catch (error) {
      throw error;
    }

    const rollbackId = this.generateRollbackId();
    this.rollback(rollbackId, { keyId, timePoint }, { user, accessInfo });
    setTimeout(() => this.clearToRollback(rollbackId), AUTO_CLEAR_INTERVAL);
    return rollbackId;
  }

  /**
   * Validate.
   * @private
   * @param {object} rollbackOptions Rollback options.
   * @param {integer} rollbackOptions.keyId KeyId to rollback.
   * @param {string} rollbackOptions.timePoint timePoint to rollback. 2023-07-20T17:15:03.183Z
   * @throws {Error} Error.
   */
  async validate({ keyId, timePoint }: { keyId: number; timePoint: string }) {
    if (!keyId) throw new Error('keyId is required');
    if (!timePoint) throw new Error('timePoint is required');
    const timeRegExp = /^(\d{4})-(\d{2})-(\d{2})[T](\d{2}):(\d{2}):(\d{2}).(\d{3})[Z]$/;
    if (!timeRegExp.test(timePoint)) throw new Error('Invalide timePoint format');
    const maxTimeRollback = 1000 * 60 * 60 * 24 * 7 + 10 * 1000; // 1 week + 10 seconds;
    if (Date.now() - new Date(timePoint).getTime() > maxTimeRollback) throw new Error("timePoint mustn't be earlier than 1 week");
  }

  checkPreviousRollbackProceed(keyId) {
    if (Object.keys(this.toRollback).length === 0) return;
    for (const rollbackId in this.toRollback) {
      if (this.toRollback[rollbackId].keyId === keyId && this.toRollback[rollbackId].keyId.status === RollbackBusiness.Statuses.Rollbacking) {
        throw new Error(`Previous rollback by passed keyId has not finished yet. RollbackId by current rollbacking: ${rollbackId}`);
      }
    }
    return;
  }

  /**
   * Generate rollback ID.
   * @return {string} Rollback ID.
   */
  generateRollbackId() {
    return randomBytes(16).toString('hex');
  }

  clearToRollback(rollbackId) {
    if (rollbackId) {
      this.toRollback[rollbackId] = undefined;
    } else {
      this.toRollback = {};
    }
    if (global.gc) global.gc();
  }

  /**
   * Rollback.
   * @private
   * @param {string} rollbackId Rollback ID.
   * @param {object} RollbackOptions Rollback options.
   * @param {integer} RollbackOptions.keyId KeyId to rollback.
   * @param {string} RollbackOptions.timePoint timePoint to rollback. 2023-07-20T17:15:03.183Z
   * @param {object} accessOptions Access options.
   * @param {string} [accessOptions.user='user'] User.
   * @param {{userId, userName}} [accessOptions.accessInfo] Access info.
   * @throws {Error} Error.
   */
  async rollback(rollbackId, { keyId, timePoint }, { user, accessInfo }) {
    this.toRollback[rollbackId] = {
      status: RollbackBusiness.Statuses.Rollbacking,
      keyId,
      timePoint,
      details: {
        historyRowsToProcessing: 0,
        removedRecordsCount: 0,
        isRemovedRecords: false,
        restoredRecordsCount: 0,
        isRestoredRecords: false,
        error: null
      }
    };
    const rollbackMeta = {
      rollbackId,
      timePoint,
      timeStart: new Date().toJSON(),
      userId: accessInfo.userId,
      userName: accessInfo.userName
    };
    let allHistoryRowsByKeyId; // [{id', 'recordId', 'operation', 'createdAt}]
    try {
      allHistoryRowsByKeyId = await this.historyModel.getAllHistoryRowsByKeyId(keyId, { createdAfter: timePoint });
      this.toRollback[rollbackId].details.historyRowsToProcessing = allHistoryRowsByKeyId.length;
    } catch (error) {
      this.toRollback[rollbackId].status = RollbackBusiness.Statuses.Failed;
      this.log.save('rollback-error|get-all-history-rows-by-keyId-error', { keyId, rollbackId, error: error?.message });
    }

    // Records ids that were created after timePoint. We will simply remove them.
    const historyRowsCreated = allHistoryRowsByKeyId.filter((el) => el.operation === OPERATIONS.CREATE);
    const createdRecordIds = historyRowsCreated.map(({ recordId }) => recordId);

    const deletedAndUpdatedRecordsIdsNeededToProcessing = allHistoryRowsByKeyId
      // Filter deleted or updated history rows.
      .filter((el) => [OPERATIONS.DELETE, OPERATIONS.UPDATE].includes(el.operation))
      // Filter history rows that relate to records that were creted before timePoint.
      // If some register record was updated/deleted, but it was created after timePoint, we mustn't pay attention to it.
      .filter((el) => !historyRowsCreated.some(({ recordId }) => el.recordId === recordId))
      .map(({ recordId }) => recordId)
      // Filter history rows, that have the same recordId.
      // If some record modified few times (or even was deleted) after timeStamp, we should process only one recordId.
      .filter((el, index, selfArr) => selfArr.indexOf(el) === index);

    try {
      await this.removeRecordsIfNeed(rollbackId, { keyId, recordsIdsToRemove: createdRecordIds }, { user, accessInfo, rollbackMeta });

      await this.restoreDeletedAndUpdatedRecords(
        rollbackId,
        { keyId, recordsIdsToRestore: deletedAndUpdatedRecordsIdsNeededToProcessing, timePoint },
        { rollbackMeta }
      );
    } catch (error) {
      // Set error status.
      this.toRollback[rollbackId].status = RollbackBusiness.Statuses.Failed;
      this.toRollback[rollbackId].details.error = error?.message;
      throw error;
    }
    this.toRollback[rollbackId].status = RollbackBusiness.Statuses.Rollbacked;
  }

  /**
   * Remove records if need it.
   * @private
   * @param {string} rollbackId Rollback ID.
   * @param {object} recordsOptions Records options.
   * @param {integer} recordsOptions.keyId KeyId to remove records.
   * @param {string[]} recordsOptions.recordsIdsToRemove Records ids to remove.
   * @param {object} accessOptions Access options.
   * @param {string} [accessOptions.user='user'] User.
   * @param {{userId, userName}} [accessOptions.accessInfo] Access info.
   * @param {{userId, userName}} [accessOptions.rollbackMeta] Rollback meta.
   * @throws {Error} Error.
   */
  async removeRecordsIfNeed(rollbackId, { keyId, recordsIdsToRemove }, { user, accessInfo, rollbackMeta }) {
    if (!rollbackId || !keyId || !recordsIdsToRemove || !user || !accessInfo) {
      this.toRollback[rollbackId].details.error = 'removeRecordsIfNeed: All params are required';
      this.toRollback[rollbackId].status = RollbackBusiness.Statuses.Failed;
      throw new Error('removeRecordsIfNeed: All params are required');
    }
    if (recordsIdsToRemove.length === 0) {
      this.toRollback[rollbackId].details.removedRecordsCount = 0;
      this.toRollback[rollbackId].details.isRemovedRecords = true;
      return;
    }
    const removeCounterCb = (removedRecordsCount) => {
      this.toRollback[rollbackId].details.removedRecordsCount = removedRecordsCount;
    };

    const { removedRecords } = await this.recordModel.bulkDelete(
      {
        key_id: keyId,
        id: { [Op.in]: recordsIdsToRemove }
      },
      undefined,
      removeCounterCb,
      user,
      { id: accessInfo.userId, name: accessInfo.userName }, // person param
      { accessInfo, rollbackMeta } as any // historyMeta param
    );
    this.toRollback[rollbackId].details.removedRecordsCount = removedRecords;
    this.toRollback[rollbackId].details.isRemovedRecords = true;
  }

  /**
   * Restore records.
   * @private
   * @param {string} rollbackId Rollback ID.
   * @param {object} recordsOptions Records options.
   * @param {integer} recordsOptions.keyId KeyId to remove records.
   * @param {string[]} recordsOptions.recordsIdsToRestore Records ids to restore.
   * @param {string[]} recordsOptions.timePoint timePoint to restore. 2023-07-20T17:15:03.183Z.
   * @param {object} accessOptions Access options.
   * @param {{userId, userName}} [accessOptions.rollbackMeta] Rollback meta.
   * @throws {Error} Error.
   */
  async restoreDeletedAndUpdatedRecords(rollbackId, { keyId, recordsIdsToRestore, timePoint }, { rollbackMeta }) {
    if (!rollbackId || !keyId || !recordsIdsToRestore || !rollbackMeta) {
      this.toRollback[rollbackId].details.error = 'restoreDeletedAndUpdatedRecords: All params are required';
      this.toRollback[rollbackId].status = RollbackBusiness.Statuses.Failed;
      throw new Error('restoreDeletedAndUpdatedRecords: All params are required');
    }
    if (recordsIdsToRestore.length === 0) {
      this.toRollback[rollbackId].details.restoredRecordsCount = 0;
      this.toRollback[rollbackId].details.isRestoredRecords = true;
      return;
    }
    const {
      data: { registerId }
    } = await this.keyModel.findById(keyId);

    this.toRollback[rollbackId].details.restoredRecordsCount = 0;
    this.toRollback[rollbackId].details.isRestoredRecords = false;

    for (const recordId of recordsIdsToRestore) {
      const historyModelResponse = await this.historyModel.getByRecordId(recordId, { offset: 0, limit: 1, createdBefore: timePoint });
      const lastHistoryRowBeforeTimePoint = historyModelResponse.data[0];
      const {
        data: {
          id,
          data: recordData,
          meta,
          created_by,
          createdBy,
          allow_tokens,
          allowTokens,
          search_string,
          searchString,
          search_string_2,
          searchString2,
          search_string_3,
          searchString3,
          signature
        },
        person
      } = lastHistoryRowBeforeTimePoint;

      const historyMeta = { ...meta.historyMeta, rollbackMeta };

      let existingRecord;
      try {
        existingRecord = await this.recordModel.findById(id);
      } catch {
        existingRecord = null;
      }
      const isRecordExist = !!existingRecord?.data;

      if (isRecordExist) {
        await this.recordModel.update(
          id,
          {
            registerId,
            keyId,
            data: recordData,
            meta,
            user: created_by || createdBy,
            searchString: search_string || searchString,
            searchString2: search_string_2 || searchString2,
            searchString3: search_string_3 || searchString3,
            person,
            signature
          },
          true,
          historyMeta
        );
      }
      if (!isRecordExist) {
        await this.recordModel.create(
          {
            id,
            registerId,
            keyId,
            data: recordData,
            meta,
            user: created_by || createdBy,
            allowTokens: allow_tokens || allowTokens,
            searchString: search_string || searchString,
            searchString2: search_string_2 || searchString2,
            searchString3: search_string_3 || searchString3,
            person,
            signature
          },
          true,
          historyMeta
        );
      }

      this.toRollback[rollbackId].details.restoredRecordsCount += 1;
    }
    this.toRollback[rollbackId].details.isRestoredRecords = true;
  }

  /**
   * Check "to rollback" status with details.
   * @param {string} rollbackId Rollback ID.
   */
  checkRollbackStatusWithDetails(rollbackId) {
    return this.toRollback[rollbackId];
  }

  /**
   * Start rollback.
   * @param {object} rollbackRecordOptions Rollback options.
   * @param {string} rollbackRecordOptions.historyId KeyId to rollback.
   * @param {string} rollbackRecordOptions.recordId KeyId to rollback.
   * @param {integer} rollbackRecordOptions.keyId KeyId to rollback.
   * @param {object} accessOptions Access options.
   * @param {string} [accessOptions.user='user'] User.
   * @param {{userId, userName}} [accessOptions.accessInfo] Access info.
   * @return {Promise<object>} Rollbacked record.
   */
  async rollbackRecord({ historyId, recordId, keyId }, { user, accessInfo }) {
    if (!historyId || !recordId || !keyId) throw new Error('All rollback record options are required');
    if (!user || !accessInfo) throw new Error('All accessOptions options are required');
    const { data: historyRow } = await this.historyModel.findById(historyId);
    if (historyRow.recordId !== recordId || historyRow.keyId !== keyId) throw new Error("Params historyId, recordId, keyId don't match");
    const {
      data: { registerId }
    } = await this.keyModel.findById(keyId);
    const {
      data: {
        id,
        data: recordData,
        meta,
        created_by,
        createdBy,
        allow_tokens,
        allowTokens,
        search_string,
        searchString,
        search_string_2,
        searchString2,
        search_string_3,
        searchString3,
        signature
      },
      person
    } = historyRow as any;

    const rollbackMeta = {
      historyId,
      timeStart: new Date().toJSON(),
      userId: accessInfo.userId,
      userName: accessInfo.userName
    };
    const historyMeta = { ...meta.historyMeta, rollbackMeta };

    let existingRecord;
    try {
      existingRecord = await this.recordModel.findById(id);
    } catch {
      existingRecord = null;
    }
    const isRecordExist = !!existingRecord?.data;

    let rollbackedRecord;

    if (isRecordExist) {
      const recordModelResponse = await this.recordModel.update(
        id,
        {
          registerId,
          keyId,
          data: recordData,
          meta,
          user: created_by || createdBy,
          searchString: search_string || searchString,
          searchString2: search_string_2 || searchString2,
          searchString3: search_string_3 || searchString3,
          person,
          signature
        },
        true,
        historyMeta
      );
      rollbackedRecord = recordModelResponse.data;
    }
    if (!isRecordExist) {
      const recordModelResponse = await this.recordModel.create(
        {
          id,
          registerId,
          keyId,
          data: recordData,
          meta,
          user: created_by || createdBy,
          allowTokens: allow_tokens || allowTokens,
          searchString: search_string || searchString,
          searchString2: search_string_2 || searchString2,
          searchString3: search_string_3 || searchString3,
          person,
          signature
        },
        true,
        historyMeta
      );
      rollbackedRecord = recordModelResponse.data;
    }
    return rollbackedRecord;
  }
}

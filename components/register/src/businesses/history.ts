import * as flattenjs from 'flattenjs';

import Business from './business';

/**
 * History business.
 * @typedef {import('../entities/history')} HistoryEntity History entity.
 */
export default class HistoryBusiness extends Business {
  static singleton: HistoryBusiness;

  /**
   * History business constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!HistoryBusiness.singleton) {
      super(config);
      HistoryBusiness.singleton = this;
    }
    return HistoryBusiness.singleton;
  }

  /**
   * Split by fields.
   * @param {HistoryEntity[]} historyList History list.
   * @returns {someRecordDataPath: {value, historyId, historyCreatedAt, operation: 'create'|'update'|'delete', meta: object}[]} History by fields.
   */
  splitByFields(historyList, splitByFieldsOrder = 'asc') {
    // Fields history container.
    const fieldsHistory = {};

    // Define flatten history.
    const flattenHistoryList = [];

    // Sort by createdAt in ASC order.
    const sortedHistoryList = historyList.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    for (const historyIndex in sortedHistoryList) {
      // Define history item.
      const history = sortedHistoryList[historyIndex];

      // Append flatten history.
      const flattenHistory = this.flattenHistory(history);
      flattenHistoryList.push(flattenHistory);
    }

    // Handle fllatten history.
    for (const flattenHistoryIndex in flattenHistoryList) {
      // Define flatten history record data to compare.
      const flattenHistory = flattenHistoryList[flattenHistoryIndex];
      const previousFlattenHistory = flattenHistoryList[Number(flattenHistoryIndex) - 1];
      const flattenHistoryRecordData =
        (flattenHistory && flattenHistory.data && flattenHistory.data.data && Object.entries(flattenHistory.data.data)) || [];
      const previousFlattenHistoryRecordData =
        (previousFlattenHistory &&
          previousFlattenHistory.data &&
          previousFlattenHistory.data.data &&
          Object.entries(previousFlattenHistory.data.data)) ||
        [];

      // Define fields diff.
      const changedFields = flattenHistoryRecordData.filter((v) => previousFlattenHistoryRecordData.some((pv) => pv[0] === v[0] && pv[1] !== v[1]));
      const newFields = flattenHistoryRecordData.filter((v) => previousFlattenHistoryRecordData.every((pv) => pv[0] !== v[0]));
      const deletedFields = previousFlattenHistoryRecordData
        .filter((pv) => flattenHistoryRecordData.every((v) => v[0] !== pv[0]))
        .map((pv) => [pv[0], undefined]);

      // Compare items and save diff.
      this.appendFieldsHistory(fieldsHistory, changedFields, 'update', flattenHistory);
      this.appendFieldsHistory(fieldsHistory, newFields, 'create', flattenHistory);
      this.appendFieldsHistory(fieldsHistory, deletedFields, 'delete', flattenHistory);
    }

    // Sort records.
    for (const fieldsHistoryIndex in fieldsHistory) {
      // historyCreatedAt generalData.state.primaryStateCode
      fieldsHistory[fieldsHistoryIndex] = fieldsHistory[fieldsHistoryIndex]
        // Sort by historyCreatedAt in order passed user.
        .sort((a, b) => (a.historyCreatedAt > b.historyCreatedAt ? (splitByFieldsOrder === 'asc' ? 1 : -1) : splitByFieldsOrder === 'asc' ? -1 : 1));
    }

    // Return fields history.
    return fieldsHistory;
  }

  /**
   * Append fields history.
   * @param {object} fieldsHistory Fields history.
   * @param {[string, any][]} fields Fields.
   * @param {'create'|'update'|'delete'} operation Operation.
   * @param {object} flattenHistory Flatten history.
   */
  appendFieldsHistory(fieldsHistory, fields, operation, flattenHistory) {
    for (const field of fields) {
      // Prepare.
      const [key, value] = field;
      if (!fieldsHistory[key]) {
        fieldsHistory[key] = [];
      }

      // Append.
      const fieldHistoryItem = {
        value,
        historyId: flattenHistory.id,
        historyCreatedAt: flattenHistory.createdAt,
        operation,
        meta: flattenHistory.meta
      };
      fieldsHistory[key].push(fieldHistoryItem);
    }
  }

  /**
   * Flatten history.
   * @param {HistoryEntity} history History entity.
   * @returns {object} History record with flatten record data.
   */
  flattenHistory(history) {
    const flattenHistoryData = flattenjs.flatten(history.data.data);
    return { ...history, data: { ...history.data, data: flattenHistoryData } };
  }
}

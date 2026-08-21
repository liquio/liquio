import { randomBytes } from 'crypto';

import Business from './business';
import RegisterModel from '../models/register';
import KeyModel from '../models/key';
import RecordModel from '../models/record';
import KeyEntity from '../entities/key';
import RegisterEntity from '../entities/register';
import RecordEntity from '../entities/record';
import { Config } from '../lib/config';
import { RedisClient } from '../lib/redis_client';

// Constants.
const AUTO_CLEAR_INTERVAL = 1000 * 60 * 60 * 24; // 1 day.
const STATUSES = {
  Preparing: 'Preparing',
  Prepared: 'Prepared',
  Exported: 'Exported',
  Failed: 'Failed'
};

/**
 * Export business.
 */
export default class ExportBusiness extends Business {
  static singleton: ExportBusiness;

  registerModel: RegisterModel;
  keyModel: KeyModel;
  recordModel: RecordModel;
  toExport: { [key: string]: any };
  exportTimeouts: Map<string, NodeJS.Timeout>;

  constructor(config: Config) {
    // Define singleton.
    if (!ExportBusiness.singleton) {
      super(config);
      this.registerModel = RegisterModel.getInstance();
      this.keyModel = KeyModel.getInstance();
      this.recordModel = RecordModel.getInstance();
      this.toExport = {}; // { exportId: { keyId, options, data: { key, register, records }, status, createdAt: new Date() } }
      this.exportTimeouts = new Map(); // Track setTimeout IDs for cleanup
      ExportBusiness.singleton = this;
    }
    return ExportBusiness.singleton;
  }

  // Export statuses.
  static get Statuses(): typeof STATUSES {
    return STATUSES;
  }

  /**
   * Get key and register by key ID.
   * @param {number} keyId Key ID.
   * @return {{key, register}} Key and register.
   * @throws {Error} Error.
   * @example
   * const { key, register } = await exportBusiness.getKeyAndRegister(1);
   */
  async getKeyAndRegister(keyId: number): Promise<{ key: KeyEntity; register: RegisterEntity }> {
    // Get key.
    const keyModelResponse = await this.keyModel.findById(keyId);
    const { data: key } = keyModelResponse || {};
    if (!key) throw new Error('Key not found');

    // Get register.
    const { registerId } = key || {};
    const registerModelResponse = await this.registerModel.findById(registerId);
    const { data: register } = registerModelResponse || {};
    if (!register) throw new Error('Register not found');

    // Return key and register.
    return { key, register };
  }

  // Get key and register and records by key ID.
  async getKeyAndRegisterAndRecords(
    keyId: number,
    options: { onlySchema?: boolean } = {}
  ): Promise<{
    key: KeyEntity;
    register: RegisterEntity;
    records?: RecordEntity[];
  }> {
    // Define params.
    const { onlySchema = false } = options;

    // Get key and register.
    const { key, register } = await this.getKeyAndRegister(keyId);

    // Return key and register if only schema.
    if (onlySchema) return { key, register };

    // Get records.
    const recordModelResponse = await this.recordModel.getByKeyId(keyId, true);
    const { data: records } = recordModelResponse || {};

    // Remove isEncrypted on export
    records.forEach((record) => {
      delete record.isEncrypted;
    });

    // Return key, register and records.
    return { key, register, records };
  }

  /**
   * Generate export ID.
   * @return {string} Export ID.
   * @example
   * const exportId = exportBusiness.generateExportId();
   */
  generateExportId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Start preparing to export.
   * @param {number} keyId Key ID.
   * @param {object} [options] Options.
   * @param {boolean} [options.onlySchema] Only schema.
   * @return {string} Export ID.
   * @example
   * const exportId = await exportBusiness.prepareToExport(1);
   */
  async startPreparingToExport(keyId: number, options = {}): Promise<string> {
    const exportId = this.generateExportId();
    this.prepareToExport(exportId, keyId, options);
    setTimeout(() => this.clearToExport(exportId), AUTO_CLEAR_INTERVAL); // Clear "to export" after 1 day.
    return exportId;
  }

  /**
   * Prepare to export.
   * @private
   * @param {string} exportId Export ID.
   * @param {number} keyId Key ID.
   * @param {object} [options] Options.
   * @param {boolean} [options.onlySchema] Only schema.
   * @return {Promise} Promise.
   * @example
   * await exportBusiness.prepareToExport('exportId', 1);
   */
  async prepareToExport(exportId: string, keyId: number, options = {}) {
    // Preset "to export".
    this.toExport[exportId] = {
      keyId,
      options,
      data: null,
      createdAt: new Date(),
      status: ExportBusiness.Statuses.Preparing
    };

    // Try to set data to export.
    try {
      const exportData = await this.getKeyAndRegisterAndRecords(keyId, options);
      this.toExport[exportId].data = exportData;
      this.toExport[exportId].status = ExportBusiness.Statuses.Prepared;

      await this.updateToExportState(exportId);
    } catch (error) {
      this.log.save('prepare-to-export-error', { exportId, keyId, error: error?.message, stack: error?.stack });
      this.toExport[exportId].status = ExportBusiness.Statuses.Failed;
      await this.updateToExportState(exportId);
    }
  }

  /**
   * Check "to export" status.
   * @param {string} exportId Export ID.
   * @return {string} Status.
   * @example
   * const status = exportBusiness.checkToExportStatus('exportId');
   */
  async checkToExportStatus(exportId: string) {
    if (this.toExport[exportId]) {
      return this.toExport[exportId].status;
    } else if (global.config?.redis?.isEnabled) {
      try {
        const serializedData = await RedisClient.getInstance().get(['register', 'exportId', exportId]);

        if (serializedData) {
          const { status } = JSON.parse(serializedData);
          return status;
        }
      } catch (error) {
        this.log.save('check-to-export-status-error', { exportId, error: error?.message, stack: error?.stack });
        throw new Error('Can not get export data.');
      }
    } else {
      this.log.save('check-to-export-status-error', { exportId, error: 'Data is missing in cache' });
      throw new Error('Can not get export data.');
    }
  }

  /**
   * Get to export data.
   * @param {string} exportId Export ID.
   * @return {{key, register, records, options: {onlySchema: boolean}}} Data to export.
   * @example
   * const dataToExport = exportBusiness.getToExportData('exportId');
   */
  async getToExportData(exportId: string) {
    if (this.toExport[exportId]) {
      return {
        ...this.toExport[exportId].data,
        options: this.toExport[exportId].options
      };
    } else if (global.config?.redis?.isEnabled) {
      try {
        const serializedData = await RedisClient.getInstance().get(['register', 'exportId', exportId]);
        if (serializedData) {
          const { data, options } = JSON.parse(serializedData);
          return { ...data, options };
        }
      } catch (error) {
        this.log.save('get-to-export-data-error', { exportId, error: error?.message, stack: error?.stack });
        throw new Error('Can not get export data.');
      }
    } else {
      this.log.save('get-to-export-data-error', { exportId, error: 'Data is missing in cache' });
      throw new Error('Can not get export data.');
    }
  }

  /**
   * Clear "to export".
   * @private
   * @param {string} [exportId] Export ID.
   * @example
   * exportBusiness.clearToExport('exportId');
   * @example
   * exportBusiness.clearToExport();
   */
  clearToExport(exportId: string) {
    if (exportId) {
      this.toExport[exportId] = undefined;
      if (global.config?.redis?.isEnabled) {
        try {
          RedisClient.getInstance().delete(['register', 'exportId', exportId]);
        } catch (error) {
          this.log.save('clear-to-export-error', { exportId, error: error?.message, stack: error?.stack });
        }
      }
    } else {
      this.toExport = {};
    }
    if (global.gc) global.gc();
  }

  async updateToExportState(exportId: string) {
    if (!this.toExport[exportId]) return;

    try {
      const serializedData = JSON.stringify(this.toExport[exportId]);

      if (global.config?.redis?.isEnabled) {
        await RedisClient.getInstance().set(['register', 'exportId', exportId], serializedData, AUTO_CLEAR_INTERVAL / 1000);
      }
    } catch (error) {
      this.log.save('update-to-export-state-error', { exportId, error: error?.message, stack: error?.stack });
    }
  }

  /**
   * Clear all pending export timeouts.
   * Useful for cleanup during shutdown or testing.
   * @example
   * exportBusiness.clearAllTimeouts();
   */
  clearAllTimeouts() {
    this.exportTimeouts.forEach((timeoutId, exportId) => {
      clearTimeout(timeoutId);
      this.log.save('clear-export-timeout', { exportId });
    });
    this.exportTimeouts.clear();
  }
}

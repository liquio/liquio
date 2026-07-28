import AfterhandlerModel from '../../../models/afterhandler';
import Log from '../../log';

export type AfterhandlerType = 'blockchain' | 'elastic' | 'plink';

export interface AfterhandlerWorkerConfig {
  isActive: boolean;
  handlingTimeout: number;
  waitingTimeout: number;
}

/**
 * Afterhandler worker.
 * @abstract
 * @typedef {import('../../../entities/history')} HistoryEntity
 * @typedef {import('../../../entities/record')} RecordEntity
 * @typedef {import('../../../models/afterhandler')} AfterhandlerModel
 */
export default class AfterhandlerWorker {
  log: Log;
  afterhandlerType: string;
  afterhandlerModel: AfterhandlerModel;
  config: any;
  started = false;
  disposed = false;

  /**
   * Afterhandler worker constructor.
   * @param {AfterhandlerType} afterhandlerType Afterhandler type.
   * @param {AfterhandlerWorkerConfig} config Config.
   * @param {AfterhandlerModel} afterhandlerModel Afterhandler model.
   */
  constructor(afterhandlerType: AfterhandlerType, config: AfterhandlerWorkerConfig, afterhandlerModel: AfterhandlerModel) {
    this.log = Log.getInstance();
    this.afterhandlerType = afterhandlerType;
    this.afterhandlerModel = afterhandlerModel;
    this.config = config;
  }

  /**
   * Handle.
   * @private
   * @abstract
   * @param {HistoryEntity} history History entity to handle.
   * @returns {Promise<boolean>} Handled indicator promise.
   */

  async handle(_history): Promise<boolean> {
    throw new Error('Abstract method should be redefined in child classes.');
  }

  /**
   * Reindex - reset.
   * @private
   * @abstract
   * @param {number} keyId Key ID.
   * @param {object} options Options.
   * @returns {Promise<boolean>} Handled indicator promise.
   */

  async reindexReset(_keyId: number, _options: any): Promise<boolean> {
    throw new Error('Abstract method should be redefined in child classes.');
  }

  /**
   * Reindex - add.
   * @private
   * @abstract
   * @param {RecordEntity} record Record.
   * @returns {Promise<boolean>} Handled indicator promise.
   */

  async reindexAdd(_record: any): Promise<boolean> {
    throw new Error('Abstract method should be redefined in child classes.');
  }

  /**
   * Start.
   */
  async start() {
    // Inform.
    this.log.save('afterhandler-worker|starting', { afterhandlerType: this.afterhandlerType });

    // Parse config.
    const { isActive, handlingTimeout, waitingTimeout } = this.config;

    // Return if not active.
    if (!isActive) {
      this.log.save('afterhandler-worker|not-active', { afterhandlerType: this.afterhandlerType });
      return;
    }

    // Set on started indicator.
    this.started = true;
    this.log.save('afterhandler-worker|started', { afterhandlerType: this.afterhandlerType });

    // Handle while started.
    while (this.started) {
      // Try to handle.

      let afterhandlerId;
      try {
        // Get history and check.
        const { history, id } = (await this.findFirstNotSynced()) || {};
        afterhandlerId = id;
        if (!history) {
          await this.wait(waitingTimeout);
          continue;
        }

        // Handle.
        const handled = await this.handle(history);

        // Set as handled if it is.
        if (handled) {
          await this.setSynced(afterhandlerId);
        }
      } catch (error) {
        this.log.save('afterhandler-worker|error', {
          error: error && error.message,
          afterhandlerType: this.afterhandlerType
        });
        try {
          if (afterhandlerId) {
            await this.setSyncedWithError(afterhandlerId, error.message);
          }
        } catch (error) {
          this.log.save('afterhandler-worker-set-synced-with-error|error', {
            afterhandlerId,
            error: error && error.message,
            afterhandlerType: this.afterhandlerType
          });
        }
      }

      // Wait.
      await this.wait(handlingTimeout);
    }
  }

  /**
   * Stop.
   */
  async stop() {
    // Set off started indicator.
    this.started = false;
    this.log.save('afterhandler-worker|stopped', { afterhandlerType: this.afterhandlerType });
  }

  /**
   * Wait.
   * @private
   * @param {number} duration Duration to wait in milliseconds.
   * @returns {Promise} Resolved after defined duration promise.
   */
  async wait(duration) {
    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  /**
   * Find first not synced.
   * @returns {AfterhandlerEntity} Afterhandler entity.
   */
  async findFirstNotSynced() {
    const { data: afterhandlerEntity } = (await this.afterhandlerModel.findFirstNotSynced(this.afterhandlerType)) || {};
    return afterhandlerEntity;
  }

  /**
   * Set synced.
   * @param {string} id Afterhandler ID.
   */
  async setSynced(id) {
    await this.afterhandlerModel.setSynced(id);
  }

  /**
   * Set synced with error.
   * @param {string} id Afterhandler ID.
   * @param {string} error Error message.
   */
  async setSyncedWithError(id, error) {
    await this.afterhandlerModel.setSyncedWithError(id, error);
  }

  /**
   * Dispose.
   * @returns {boolean} GC called indicator. Equals `1` if GC called and `0` in other case.
   */
  dispose() {
    // Inform.
    this.log.save('afterhandler-worker|disposing', { afterhandlerType: this.afterhandlerType });

    // Check if already disposed.
    if (this.disposed) {
      return;
    }

    // Dispose.
    this.config = null;
    this.afterhandlerModel = null;
    this.findFirstNotSynced = null;
    this.setSynced = null;

    // Set disposed indicator.
    this.disposed = true;
    this.log.save('afterhandler-worker|disposed', { afterhandlerType: this.afterhandlerType });

    // Return `0` if GC not available.
    if (!global.gc) {
      return 0;
    }

    // Call GC and return `1`.
    if (global.gc) {
      global.gc['collect']();
      this.log.save('afterhandler-worker|gc', { afterhandlerType: this.afterhandlerType });
      return 1;
    }
  }

  /**
   * Validate record.
   * @param {RecordEntity} record Record.
   * @param {string} operation Operation.
   * @returns {Promise} Resolved promise.
   */

  async validateRecord(_record, _operation) {}
}

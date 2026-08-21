import _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';

import AfterhandlerWorker from './worker';
import prepareAxiosErrorToLog from '../../prepareAxiosErrorToLog';

// Constants.
const AFTERHANDLER_TYPE = 'plink';

/**
 * PLink afterhandler worker.
 */
export default class PLinkAfterhandlerWorker extends AfterhandlerWorker {
  config: any;
  url: string;
  token: string;
  timeout: number;

  /**
   * PLink afterhandler worker constructor.
   * @param {{handlingTimeout, waitingTimeout}} config Config.
   * @param {AfterhandlerModel} afterhandlerModel Afterhandler model.
   */
  constructor(config, afterhandlerModel) {
    super(AFTERHANDLER_TYPE, config, afterhandlerModel);

    this.config = config;

    // Parse config.
    const { url, token, waitingTimeout = 20000 } = this.config;
    this.url = url;
    this.token = token;
    this.timeout = waitingTimeout;
  }

  /**
   * Afterhandler type.
   * @returns {AFTERHANDLER_TYPE} Afterhandler type.
   */
  static get afterhandlerType() {
    return AFTERHANDLER_TYPE;
  }

  /**
   * Handle.
   * @param {HistoryEntity} history History entity to handle.
   * @returns {Promise<boolean>} Handled indicator promise.
   */
  async handle(history) {
    // Inform.
    this.log.save('afterhandler|handling-started', {
      history: history.toJSON(),
      afterhandlerType: PLinkAfterhandlerWorker.afterhandlerType
    });

    // Parse history entity.
    const { recordId, operation, data } = history;
    const {
      data: { keyId }
    } = history;

    // Save to plink.
    let handlingResult;
    switch (operation) {
      case 'create':
        handlingResult = await this.create(keyId, 'record', recordId, data);
        break;
      default:
        throw new Error('Wrong operation type.');
    }

    const handled = handlingResult;
    this.log.save('afterhandler|handling-result', {
      history: history.toJSON(),
      afterhandlerType: PLinkAfterhandlerWorker.afterhandlerType,
      handlingResult,
      handled
    });

    return handled;
  }

  /**
   * Reindex - reset.
   * @param {number} keyId Key ID.
   * @param {object} options Options. Used to create new index.
   * @returns {Promise<boolean>} Handled indicator promise.
   */
  async reindexReset(_keyId: number, _options: any): Promise<boolean> {
    // Check.
    const { isActive } = this.config;
    if (!isActive) {
      this.log.save('afterhandler|reindex-reset|not-active', {
        afterhandlerType: PLinkAfterhandlerWorker.afterhandlerType
      });

      return true;
    }

    return true;
  }

  /**
   * Reindex - add.
   * @param {RecordEntity} record Record.
   * @returns {Promise<boolean>} Handled indicator promise.
   */
  async reindexAdd(_record: any): Promise<boolean> {
    const { isActive } = this.config;
    if (!isActive) {
      this.log.save('afterhandler|reindex-add|not-active', {
        afterhandlerType: PLinkAfterhandlerWorker.afterhandlerType
      });

      return true;
    }

    return true;
  }

  /**
   * Create data.
   * @param {number} keyId Key ID.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @param {object} data Data to save.
   * @returns {Promise<boolean>}
   */
  async create(keyId, entity, id, data) {
    try {
      const method = _.get(data, 'data.deepLink.method');
      const hash = _.get(data, 'data.deepLink.hash');

      if (!method || !hash) {
        throw new Error('Method or hash is not defined.');
      }

      // Request options.
      const requestOptions: AxiosRequestConfig = {
        url: `${this.url}/link`,
        method: 'POST',
        headers: { token: this.token, 'Content-Type': 'application/json' },
        data: {
          type: 'external',
          options: {
            templateName: 'register',
            templateMethod: method,
            filter: {
              recordId: id
            }
          },
          small: true,
          definedHash: hash
        },
        timeout: this.timeout
      };
      this.log.save('plink-request', requestOptions);

      const response = await axios(requestOptions);
      this.log.save('plink-create-data-response', { id, response: response.data });
      if (response['error']) {
        throw new Error(response['error']);
      }

      // Return plink result.
      if (response && response['data'] && response['data'] !== '') {
        return true;
      }

      return false;
    } catch (error) {
      this.log.save('plink-create-data-error', {
        keyId,
        id,
        data,
        ...prepareAxiosErrorToLog(error)
      });
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error?.message || 'Bad Request');
      }

      return false;
    }
  }

  /**
   * Validate record.
   * @param {object} data Record data.
   * @param {number} keyId Key ID.
   * @returns {Promise<void>}
   * @throws {Error} Validation error.
   */
  async validateRecord({ data, key_id: keyId }) {
    const { isActive, keys } = this.config;

    if (!isActive || !keys.includes(keyId)) {
      return;
    }

    if (!_.get(data, 'deepLink.method')) {
      throw new Error('Validation error: deepLink.method is not defined.');
    }
    if (!_.get(data, 'deepLink.hash')) {
      throw new Error('Validation error: deepLink.hash is not defined.');
    }
  }
}

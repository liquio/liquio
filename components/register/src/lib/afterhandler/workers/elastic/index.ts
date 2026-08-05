import AfterhandlerWorker from '../worker';
import HttpRequest from '../../../http_request';
import KeyModel from '../../../../models/key';
import KeyEntity from '../../../../entities/key';

// Constants.
const AFTERHANDLER_TYPE = 'elastic';
const URL_DATA_ID_KEY = '{id}';
const URL_INDEX_ID_KEY = '{key-id}';
const DEFAULT_API_URL = 'http://localhost:9200';
const DEFAULT_API_METHODS = {
  createOrUpdateData: {
    requestType: 'PUT',
    urlSuffix: '/register_key_{key-id}/_doc/{id}'
  },
  deleteData: {
    requestType: 'DELETE',
    urlSuffix: '/register_key_{key-id}/_doc/{id}'
  },
  dropIndex: {
    requestType: 'DELETE',
    urlSuffix: '/register_key_{key-id}'
  },
  createIndex: {
    requestType: 'PUT',
    urlSuffix: '/register_key_{key-id}'
  },
  getIndexCount: {
    requestType: 'GET',
    urlSuffix: '/register_key_{key-id}/_count'
  }
};
const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

/**
 * Elastic afterhandler worker.
 */
export default class ElasticAfterhandlerWorker extends AfterhandlerWorker {
  apiUrl: string;
  apiMethods: any;
  headers: any;
  timeout: number;
  keyModel: KeyModel;

  /**
   * Elastic afterhandler worker constructor.
   * @param {{handlingTimeout, waitingTimeout}} config Config.
   * @param {AfterhandlerModel} afterhandlerModel Afterhandler model.
   */
  constructor(config, afterhandlerModel) {
    super(AFTERHANDLER_TYPE, config, afterhandlerModel);

    this.config = config;

    // Parse config.
    const { options: { apiUrl: configApiUrl, apiMethods: configApiMethods, headers: configHeaders } = {}, waitingTimeout = 20000 } = this.config;
    this.apiUrl = configApiUrl || DEFAULT_API_URL;
    this.apiMethods = { ...DEFAULT_API_METHODS, ...configApiMethods };
    this.headers = { ...DEFAULT_HEADERS, ...configHeaders };
    this.timeout = waitingTimeout;
    this.keyModel = KeyModel.getInstance();
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
      afterhandlerType: ElasticAfterhandlerWorker.afterhandlerType
    });

    // Parse history entity.
    const { recordId, operation, data } = history;
    const keyId = history.keyId || history.data?.keyId || history.data?.key_id;

    // Save to elastic.
    let handlingResult;
    switch (operation) {
      case 'create':
      case 'update':
        handlingResult = await this.createOrUpdateData(keyId, 'record', recordId, data);
        break;
      case 'delete':
        handlingResult = await this.deleteData(keyId, 'record', recordId);
        break;
      default:
        throw new Error('Wrong operation type.');
    }

    // Return `1` if handled and `0` if other case.
    const handled = ['created', 'updated', 'deleted'].includes(handlingResult) || (operation === 'delete' && handlingResult === 'not_found');
    this.log.save('afterhandler|handling-result', {
      history: history.toJSON(),
      afterhandlerType: ElasticAfterhandlerWorker.afterhandlerType,
      handlingResult,
      handled
    });
    return handled;
  }

  async getIndexCount(keyId) {
    const { isActive } = this.config;

    // Check.
    if (!isActive) {
      this.log.save('afterhandler|get-index-count|not-active', {
        afterhandlerType: ElasticAfterhandlerWorker.afterhandlerType
      });
      throw new Error('Elastic afterhandler is not active.');
    }

    if (!this.apiMethods.getIndexCount) {
      this.log.save('afterhandler|get-index-count|not-defined', {
        afterhandlerType: ElasticAfterhandlerWorker.afterhandlerType
      });
      throw new Error('Elastic afterhandler is not defined.');
    }

    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.getIndexCount.urlSuffix}`.replace(URL_INDEX_ID_KEY, `${keyId}`),
      method: this.apiMethods.getIndexCount.requestType,
      headers: this.headers,
      timeout: this.timeout
    };

    // Do request.
    let elasticData;
    try {
      elasticData = await HttpRequest.send(requestOptions);
      this.log.save('elastic-get-index-count-response', { response: elasticData });
    } catch (error) {
      this.log.save('elastic-get-index-count-error', { error: error && error.message, keyId });
    }

    // Return elastic result.
    return elasticData;
  }

  /**
   * Reindex - reset.
   * @param {number} keyId Key ID.
   * @param {object} options Options. Used to create new index.
   * @returns {Promise<boolean>} Handled indicator promise.
   */
  async reindexReset(keyId, options) {
    // Check.
    const { isActive } = this.config;
    if (!isActive) {
      this.log.save('afterhandler|reindex-reset|not-active', { afterhandlerType: ElasticAfterhandlerWorker.afterhandlerType });
      return true;
    }

    // Reset index.
    this.log.save('afterhandler|reindex-reset', { afterhandlerType: ElasticAfterhandlerWorker.afterhandlerType, keyId });
    const dropIndexResult = await this.dropIndex(keyId);
    const createIndexResult = await this.createIndex(keyId, options);

    this.log.save('afterhandler|reindex-result', {
      afterhandlerType: ElasticAfterhandlerWorker.afterhandlerType,
      keyId,
      dropIndexResult,
      createIndexResult,
      options
    });
    return true;
  }

  /**
   * Reindex - add.
   * @param {RecordEntity} record Record.
   * @returns {Promise<boolean>} Handled indicator promise.
   */
  async reindexAdd(record) {
    const { isActive } = this.config;
    if (!isActive) {
      this.log.save('afterhandler|reindex-add|not-active', { afterhandlerType: ElasticAfterhandlerWorker.afterhandlerType });
      return true;
    }
    const keyId = record.keyId || record.key_id;
    const handlingResult = await this.createOrUpdateData(keyId, 'record', record.id, record);
    const handled = ['created', 'updated', 'deleted'].includes(handlingResult);
    return handled;
  }

  /**
   * Create data.
   * @param {number} keyId Key ID.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @param {object} data Data to save.
   * @returns {Promise<'created'|'updated'>} Elastic operation result.
   */
  async createOrUpdateData(keyId, entity, id, data) {
    // Define blockchain data params.
    const elasticDataId = this.getElasticDataId(entity, id);

    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.createOrUpdateData.urlSuffix.replace(URL_DATA_ID_KEY, elasticDataId)}`.replace(
        URL_INDEX_ID_KEY,
        `${keyId}`
      ),
      method: this.apiMethods.createOrUpdateData.requestType,
      headers: this.headers,
      body: JSON.stringify(data),
      timeout: this.timeout
    };

    // Do request.
    let elasticData;
    try {
      elasticData = await HttpRequest.send(requestOptions);
      this.log.save('elastic-create-or-update-data-response', { id, response: elasticData });
      if (elasticData && elasticData.error) {
        const errorMessage = (elasticData && elasticData.error && elasticData.error.reason) || 'Elastic request error.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.reason || error.message || 'Elastic request error.';
      this.log.save('elastic-create-or-update-data-error', { error: errorMessage, params: { id } });
      this.log.save('elastic-create-or-update-data-error-details', {
        error: errorMessage,
        params: { id },
        requestOptions: { ...requestOptions, headers: '***' }
      });

      throw new Error(errorMessage);
    }

    // Return elastic result.
    return elasticData && elasticData.result;
  }

  /**
   * Delete data.
   * @param {number} keyId Key ID.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @returns {Promise<'deleted'>} Elastic operation result.
   */
  async deleteData(keyId, entity, id) {
    // Define blockchain data params.
    const elasticDataId = this.getElasticDataId(entity, id);

    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.deleteData.urlSuffix.replace(URL_DATA_ID_KEY, elasticDataId)}`.replace(URL_INDEX_ID_KEY, `${keyId}`),
      method: this.apiMethods.deleteData.requestType,
      headers: this.headers,
      timeout: this.timeout
    };

    // Do request.
    let elasticData;
    try {
      elasticData = await HttpRequest.send(requestOptions);
      this.log.save('elastic-delete-data-response', { id, response: elasticData });
    } catch (error) {
      if (error.message === 'Request failed with status code 404') {
        return 'not_found';
      }
      this.log.save('elastic-create-or-update-data-error', { error: error && error.message, params: { id } });
    }

    // Return elastic result.
    return elasticData && elasticData.result;
  }

  /**
   * Drop index.
   * @param {number} keyId Key ID.
   * @returns {Promise<string>} Elastic operation result.
   */
  async dropIndex(keyId) {
    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.dropIndex.urlSuffix}`.replace(URL_INDEX_ID_KEY, `${keyId}`),
      method: this.apiMethods.dropIndex.requestType,
      headers: this.headers,
      timeout: this.timeout
    };

    // Do request.
    let elasticData;
    try {
      this.log.save('elastic-drop-index-request', { requestOptions });
      elasticData = await HttpRequest.send(requestOptions);
      this.log.save('elastic-drop-index-response', { response: elasticData });
    } catch (error) {
      this.log.save('elastic-drop-index-error', { error: error && error.message, keyId });
    }

    // Return elastic result.
    return elasticData && (elasticData.acknowledged || elasticData.result || elasticData.error);
  }

  async schemaToElasticMappings(keyId) {
    const modelResponse = await this.keyModel.findById(keyId);

    if (!modelResponse) {
      return {};
    }

    const { data: key } = modelResponse as { data: KeyEntity };

    function processProperties(properties: Record<string, any>): Record<string, any> {
      const result: Record<string, any> = {};
      for (const key in properties) {
        const prop = properties[key];
        const type = prop.typeElastic;

        if (prop.type === 'object' && prop.properties) {
          const nested = processProperties(prop.properties);

          if (nested) {
            result[key] = { properties: nested };
          }
        }

        if (prop.type === 'array' && prop.items) {
          const nested = processProperties(prop.items.properties);

          if (nested) {
            result[key] = { properties: nested };
          }
        } else if (type) {
          switch (type) {
            case 'text':
              result[key] = { type, fields: { keyword: { type: 'keyword' } } };
              break;
            default:
              result[key] = { type };
              break;
          }
        }
      }
      return result;
    }

    const mappings = {
      properties: processProperties({
        data: {
          type: 'object',
          properties: key.schema.properties
        }
      })
    };

    return mappings;
  }

  /**
   * Drop index.
   * @param {number} keyId Key ID.
   * @param {object} options Options. Used to create new index.
   * @returns {Promise<string>} Elastic operation result.
   */
  async createIndex(keyId, options = {}) {
    const mappings = await this.schemaToElasticMappings(keyId);

    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.createIndex.urlSuffix}`.replace(URL_INDEX_ID_KEY, `${keyId}`),
      method: this.apiMethods.createIndex.requestType,
      headers: this.headers,
      body: JSON.stringify({
        ...options,
        mappings
      }),
      timeout: this.timeout
    };

    // Do request.
    let elasticData;
    try {
      this.log.save('elastic-create-index-request', { requestOptions });
      elasticData = await HttpRequest.send(requestOptions);
      this.log.save('elastic-create-index-response', { response: elasticData });
    } catch (error) {
      this.log.save('elastic-drop-index-error', { error: error && error.message, keyId });
    }

    // Return elastic result.
    return elasticData && (elasticData.result || elasticData.error);
  }

  /**
   * Get elastic data ID.
   * @param {string} entity Entity.
   * @param {string} id ID.
   * @returns {string} Elastic data ID.
   */
  getElasticDataId(entity, id) {
    return `${entity}-${id}`;
  }
}

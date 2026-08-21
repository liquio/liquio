import BlockchainProvider from './provider';
import HttpRequest from '../../../../http_request';

// Constants.
const URL_DATA_ID_KEY = '{id}';
const DEFAULT_API_URL = 'http://openenvironment.itl-dev.com:3003';
const DEFAULT_API_METHODS = {
  getData: {
    requestType: 'GET',
    urlSuffix: '/api/documents/{id}'
  },
  createData: {
    requestType: 'POST',
    urlSuffix: '/api/documents'
  },
  updateData: {
    requestType: 'PUT',
    urlSuffix: '/api/documents'
  },
  deleteData: {
    requestType: 'POST',
    urlSuffix: '/api/documents/revoke'
  }
};
const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

/**
 * Hyperledger Fabric blockchain provider.
 */
export default class HyperledgerFabricBlockchainProvider extends BlockchainProvider {
  apiUrl: string;
  apiMethods: any;
  headers: any;
  timeout: number;

  /**
   * Hyperledger Fabric blockchain provider constructor.
   * @param {string} config Provider config.
   */
  constructor(config) {
    super(config);

    // Parse config.
    const { apiUrl: configApiUrl, apiMethods: configApiMethods, headers: configHeaders, waitingTimeout = 10000 } = this.config;
    this.apiUrl = configApiUrl || DEFAULT_API_URL;
    this.apiMethods = { ...DEFAULT_API_METHODS, ...configApiMethods };
    this.headers = { ...DEFAULT_HEADERS, ...configHeaders };
    this.timeout = waitingTimeout;
  }

  /**
   * Provider name.
   */
  static get providerName() {
    return 'hyperledger-fabric';
  }

  /**
   * Get data.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @returns {Promise<object>} Data promise.
   */
  async getData(entity, id) {
    // Define blockchain data params.
    const blockchainDataId = this.getBlockchainDataId(entity, id);

    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.getData.urlSuffix.replace(URL_DATA_ID_KEY, blockchainDataId)}`,
      method: this.apiMethods.getData.requestType,
      headers: this.headers,
      timeout: this.timeout
    };

    // Do request.
    let blockchainData;
    try {
      blockchainData = await HttpRequest.send(requestOptions);
      this.log.save('blockchain-get-data-response', { id, response: blockchainData });
    } catch (error) {
      this.log.save('blockchain-get-data-error', { error: error && error.message, params: { id } });
    }

    // Return blockchain data.
    return blockchainData;
  }

  /**
   * Create data.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @param {string} userId User ID.
   * @param {object} data Data.
   */
  async createData(entity, id, userId, data) {
    // Define blockchain data params.
    const blockchainDataId = this.getBlockchainDataId(entity, id);
    const blockchainDataName = this.getBlockchainDataName(entity);

    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.createData.urlSuffix}`,
      method: this.apiMethods.createData.requestType,
      headers: this.headers,
      body: JSON.stringify({
        id: blockchainDataId,
        name: blockchainDataName,
        issuerId: userId,
        documentData: data
      }),
      timeout: this.timeout
    };

    // Do request.
    let blockchainData;
    try {
      blockchainData = await HttpRequest.send(requestOptions);
      this.log.save('blockchain-create-data-response', { id, response: blockchainData });
    } catch (error) {
      this.log.save('blockchain-create-data-error', { error: error && error.message, params: { id } });
    }

    // Return blockchain data.
    return blockchainData;
  }

  /**
   * Update data.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @param {string} userId User ID.
   * @param {object} data Data.
   */
  async updateData(entity, id, userId, data) {
    // Define blockchain data params.
    const blockchainDataId = this.getBlockchainDataId(entity, id);
    const blockchainDataName = this.getBlockchainDataName(entity);

    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.updateData.urlSuffix}`,
      method: this.apiMethods.updateData.requestType,
      headers: this.headers,
      body: JSON.stringify({
        id: blockchainDataId,
        name: blockchainDataName,
        issuerId: userId,
        documentData: data
      }),
      timeout: this.timeout
    };

    // Do request.
    let blockchainData;
    try {
      blockchainData = await HttpRequest.send(requestOptions);
      this.log.save('blockchain-update-data-response', { id, response: blockchainData });
    } catch (error) {
      this.log.save('blockchain-update-data-error', { error: error && error.message, params: { id } });
    }

    // Return blockchain data.
    return blockchainData;
  }

  /**
   * Delete data.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @param {string} userId User ID.
   */
  async deleteData(entity, id, userId) {
    // Define blockchain data params.
    const blockchainDataId = this.getBlockchainDataId(entity, id);

    // Request options.
    const requestOptions = {
      url: `${this.apiUrl}${this.apiMethods.deleteData.urlSuffix}`,
      method: this.apiMethods.deleteData.requestType,
      headers: this.headers,
      body: JSON.stringify({
        id: blockchainDataId,
        revokeReason: userId
      }),
      timeout: this.timeout
    };

    // Do request.
    let blockchainData;
    try {
      blockchainData = await HttpRequest.send(requestOptions);
      this.log.save('blockchain-delete-data-response', { id, response: blockchainData });
    } catch (error) {
      this.log.save('blockchain-delete-data-error', { error: error && error.message, params: { id } });
    }

    // Return blockchain data.
    return blockchainData;
  }
}

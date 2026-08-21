import AfterhandlerWorker from '../worker';
import providers from './providers';
import HyperledgerFabricBlockchainProvider from './providers/hyperledger_fabric';

// Constants.
const AFTERHANDLER_TYPE = 'blockchain';

/**
 * Blockchain afterhandler worker.
 * @typedef {import('../../../../entities/history')} HistoryEntity
 * @typedef {import('../../../../entities/afterhandler')} AfterhandlerEntity
 * @typedef {import('../../../../models/afterhandler')} AfterhandlerModel
 */
export default class BlockchainAfterhandlerWorker extends AfterhandlerWorker {
  provider: HyperledgerFabricBlockchainProvider;

  /**
   * Blockchain afterhandler worker constructor.
   * @param {{handlingTimeout, waitingTimeout}} config Config.
   * @param {AfterhandlerModel} afterhandlerModel Afterhandler model.
   */
  constructor(config, afterhandlerModel) {
    super(AFTERHANDLER_TYPE, config, afterhandlerModel);

    // Define params.
    this.provider;

    // Init.
    this.init();
  }

  /**
   * Afterhandler type.
   * @returns {AFTERHANDLER_TYPE} Afterhandler type.
   */
  static get afterhandlerType() {
    return AFTERHANDLER_TYPE;
  }

  /**
   * Init.
   */
  init() {
    // Parse config.
    const {
      options: { providerName, providerParams }
    } = this.config;

    // Define provider.
    const Provider = providers.find((v) => v.providerName === providerName);
    if (!Provider) {
      throw new Error('Blockchain provider not defined.');
    }

    // Init provider.
    const provider = new Provider(providerParams);
    this.provider = provider;

    // Log.
    this.log.save('blockchain-initialized', { providerName });
  }

  /**
   * Handle.
   * @private
   * @param {HistoryEntity} history History entity to handle.
   * @returns {Promise<boolean>} Handled indicator promise.
   */
  async handle(history) {
    // Parse history entity.
    const { recordId, createdBy, operation, data } = history;

    // Save to blockchain.
    let handlingResult;
    switch (operation) {
      case 'create':
        handlingResult = await this.provider.createData('record', recordId, createdBy, data);
        break;
      case 'update':
        handlingResult = await this.provider.updateData('record', recordId, createdBy, data);
        break;
      case 'delete':
        handlingResult = await this.provider.deleteData('record', recordId, createdBy);
        break;
      default:
        throw new Error('Wrong operation type.');
    }

    // Return `true` if handled and `false` if other case.
    const handled = handlingResult && handlingResult.status === 200;
    this.log.save('afterhandler|handling-result', {
      history,
      afterhandlerType: BlockchainAfterhandlerWorker.afterhandlerType,
      handlingResult,
      handled
    });
    return handled;
  }

  /**
   * Reindex - reset.
   * @param {number} keyId Key ID.
   * @returns {Promise<boolean>} Handled indicator promise.
   */
  async reindexReset(keyId) {
    // Check.
    const { isActive } = this.config;
    if (!isActive) {
      this.log.save('afterhandler|reindex-reset|not-active', { afterhandlerType: this.afterhandlerType });
      return true;
    }

    // Handle.
    this.log.save('afterhandler|reindex-reset', { afterhandlerType: BlockchainAfterhandlerWorker.afterhandlerType, keyId });
    return true;
  }

  /**
   * Reindex - add.
   * @param {RecordEntity} record Record.
   * @returns {Promise<boolean>} Handled indicator promise.
   */
  async reindexAdd(record) {
    // Check.
    const { isActive } = this.config;
    if (!isActive) {
      this.log.save('afterhandler|reindex-add|not-active', { afterhandlerType: this.afterhandlerType });
      return true;
    }

    // Handle.
    const handlingResult = await this.provider.createData('record', record.id, record.updatedBy, record);
    const handled = handlingResult && handlingResult['status'] === 200;
    return handled;
  }
}

const { matchedData } = require('express-validator');

const Controller = require('./controller');
const AssetsBusiness = require('../businesses/assets');

/**
 * Unit controller.
 */
class AssetsController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AssetsController.singleton) {
      super(config);
      this.assetsBusiness = new AssetsBusiness(config);
      AssetsController.singleton = this;
    }
    return AssetsController.singleton;
  }

  /**
   * Get assets to units information.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */

  async getToUnits(req, res) {
    const { user_ids: userIdsString } = matchedData(req, { locations: ['query'] });
    const userIds = userIdsString.split(',');
    let encryptedDataResult;
    try {
      encryptedDataResult = await this.assetsBusiness.getToUnits(userIds);
    } catch (error) {
      log.save('assets-get-to-units-error', { error: error.message, stack: error.stack }, 'error');
      return this.responseError(res, error);
    }
    this.responseData(res, encryptedDataResult);
  }

  /**
   * Get assets to registers information.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getToRegisters(req, res) {
    const { user_ids: userIdsString } = matchedData(req, { locations: ['query'] });
    const userIds = userIdsString.split(',');
    let encryptedDataResult;
    try {
      encryptedDataResult = await this.assetsBusiness.getToRegisters(userIds);
    } catch (error) {
      log.save('assets-get-to-registers-error', { error: error.message, stack: error.stack }, 'error');
      return this.responseError(res, error);
    }
    this.responseData(res, encryptedDataResult);
  }
}

module.exports = AssetsController;

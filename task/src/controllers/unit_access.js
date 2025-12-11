
const Controller = require('./controller');
const UnitAccessModel = require('../models/unit_access');

/**
 * Unit access controller.
 */
class UnitAccessController extends Controller {
  /**
   * Unit access controller constructor.
   */
  constructor() {
    // Define singleton.
    if (!UnitAccessController.singleton) {
      super();
      this.unitAccessModel = new UnitAccessModel();
      UnitAccessController.singleton = this;
    }
    return UnitAccessController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Define params.
    const { unit_id: unitId, type } = req.query;
    let filter = {};
    if (unitId) { filter.unit_id = (unitId === 'null' ? null : unitId); }
    if (type) { filter.type = type; }

    // Get unit access list.
    let unitAccessList;
    try {
      unitAccessList = await this.unitAccessModel.getAll(filter);
    } catch (error) {
      this.responseError(res, error);
    }

    this.responseData(res, unitAccessList);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const { id } = req.params;

    // Get unit access.
    let unitAccess;
    try {
      unitAccess = await this.unitAccessModel.findById(id);
      if (!unitAccess) { return this.responseError(res, 'Unit access not found.', 404); }
    } catch (error) {
      this.responseError(res, error);
    }

    this.responseData(res, unitAccess);
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    // Define params.
    const { unitId, type, data } = req.body;

    // Create unit access.
    let unitAccess;
    try {
      unitAccess = await this.unitAccessModel.create({ unitId, type, data });
      if (!unitAccess) { return this.responseError(res, 'Can not create unit access.', 500); }
    } catch (error) {
      this.responseError(res, error);
    }

    this.responseData(res, unitAccess);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    // Define params.
    const { id } = req.params;
    const { unitId, type, data } = req.body;

    // Create unit access.
    let unitAccess;
    try {
      unitAccess = await this.unitAccessModel.update(id, { unitId, type, data });
      if (!unitAccess) { return this.responseError(res, 'Can not update unit access.', 500); }
    } catch (error) {
      this.responseError(res, error);
    }

    this.responseData(res, unitAccess);
  }

  /**
   * Delete.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    // Define params.
    const { id } = req.params;

    // Get unit access.
    let isDeleted;
    try {
      isDeleted = await this.unitAccessModel.deleteById(id);
      if (!isDeleted) { return this.responseError(res, 'Can not delete unit access.', 500); }
    } catch (error) {
      this.responseError(res, error);
    }

    this.responseData(res, isDeleted);
  }
}

module.exports = UnitAccessController;

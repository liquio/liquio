import { matchedData } from 'express-validator';

import { Controller } from './controller';
import { UnitAccessBusiness } from '../businesses/unit_access';

/**
 * Unit access controller.
 */
export class UnitAccessController extends Controller {
  private static singleton: UnitAccessController;

  private unitAccessBusiness: UnitAccessBusiness;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UnitAccessController.singleton) {
      super(config);
      this.unitAccessBusiness = new UnitAccessBusiness();
      UnitAccessController.singleton = this;
    }
    return UnitAccessController.singleton;
  }

  /**
   * Get unit access.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getUnitAccess(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const { unit_id, type } = queryData;

    let unitAccess;
    try {
      unitAccess = await this.unitAccessBusiness.getUnitAccess({ unit_id, type });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, unitAccess);
  }

  /**
   * Find unit access by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findUnitAccessById(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    let unitAccess;
    try {
      unitAccess = await this.unitAccessBusiness.findUnitAccessById(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, unitAccess);
  }

  /**
   * Create unit access.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createUnitAccess(req, res) {
    const body = matchedData(req, { locations: ['body'] });
    let unitAccess;
    try {
      unitAccess = await this.unitAccessBusiness.createUnitAccess(body);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, unitAccess);
  }

  /**
   * Update unit access by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateUnitAccessById(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    const body = matchedData(req, { locations: ['body'] });
    let unitAccess;
    try {
      unitAccess = await this.unitAccessBusiness.updateUnitAccessById(id, body);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, unitAccess);
  }

  /**
   * Delete unit access by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteUnitAccessById(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    let unitAccess;
    try {
      unitAccess = await this.unitAccessBusiness.deleteUnitAccessById(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, unitAccess);
  }
}

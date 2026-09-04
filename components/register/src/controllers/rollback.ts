import { matchedData } from 'express-validator';

import { Request, Response } from '../router';
import Controller from './controller';
import RollbackBusiness from '../businesses/rollback';

/**
 * Rollback controller.
 */
export default class RollbackController extends Controller {
  static singleton: RollbackController;

  rollbackBusiness: RollbackBusiness;

  /**
   * Rollback controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!RollbackController.singleton) {
      super(config);
      this.rollbackBusiness = new RollbackBusiness(config);
      RollbackController.singleton = this;
    }
    return RollbackController.singleton;
  }
  /**
   * Start rollback.
   */
  async startRollback(req: Request, res: Response) {
    const { keyId, timePoint } = req.body;
    const { user } = req.auth;
    const accessInfo = req.accessInfo || {}; // Sample: `{ userId, userName }`.

    // Start rollback.
    let rollbackId;
    try {
      rollbackId = await this.rollbackBusiness.startRollback({ keyId, timePoint }, { user, accessInfo });
    } catch (error) {
      this.log.save('start-rollback-error', { keyId, timePoint, error: error?.message });
      return this.responseError(res, 'Can not start rollback.', 500, { error: error?.message });
    }

    // Return response.
    this.responseData(res, { keyId, rollbackId });
  }

  /**
   * Get rollback status with details.
   */
  async getRollbackStatusWithDetails(req: Request, res: Response) {
    // Get params.
    const { rollbackId } = matchedData(req, { locations: ['params'] });

    // Check rollback status.
    let statusWithDetails;
    try {
      statusWithDetails = await this.rollbackBusiness.checkRollbackStatusWithDetails(rollbackId);
    } catch (error) {
      this.log.save('get-rollback-status-error', { rollbackId, error: error?.message });
      return this.responseError(res, 'Can not get rollback status.');
    }

    // Return response.
    this.responseData(res, { rollbackId, ...statusWithDetails });
  }

  /**
   * Rollback one record.
   */
  async rollbackRecord(req: Request, res: Response) {
    const { historyId, recordId, keyId } = req.body;
    const { user } = req.auth;
    const accessInfo = req.accessInfo || {}; // Sample: `{ userId, userName }`.

    // Rollback record.
    let rollbackedRecord;
    try {
      rollbackedRecord = await this.rollbackBusiness.rollbackRecord({ historyId, recordId, keyId }, { user, accessInfo });
    } catch (error) {
      this.log.save('rollback-record-error', { historyId, recordId, keyId, error: error?.message });
      return this.responseError(res, 'Can not rollback record.', 500, { error: error?.message });
    }

    // Return response.
    this.responseData(res, { rollbackedRecord });
  }
}

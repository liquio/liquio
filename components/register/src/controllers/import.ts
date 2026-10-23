import { matchedData } from 'express-validator';

import { Request, Response } from '../router';
import Controller from './controller';
import ImportBusiness from '../businesses/import';

/**
 * Import controller.
 */
export default class ImportController extends Controller {
  static singleton: ImportController;

  importBusiness: ImportBusiness;

  /**
   * Keys controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    // Define singleton.
    if (!ImportController.singleton) {
      super(config);
      this.importBusiness = new ImportBusiness(config);
      ImportController.singleton = this;
    }
    return ImportController.singleton;
  }

  /**
   * Start import.
   * @param {object} req Request object.
   * @param {object} res Response object.
   */
  async startImport(req: Request, res: Response) {
    // Get params.
    const { key, register, records, options = { onlySchema: false } } = req.body;
    const { user } = req.auth;
    const accessInfo = req.accessInfo || {}; // Sample: `{ userId, userName }`.

    // Start import.
    let importId;
    try {
      importId = await this.importBusiness.startImport({ key, register, records, options }, true, user, accessInfo);
    } catch (error) {
      this.log.save('start-import-error', { key, register, records, error: error?.message });
      return this.responseError(res, 'Can not start import.');
    }

    // Return response.
    this.responseData(res, { keyId: key.id, registerId: register.id, recordsCount: records?.length, importId });
  }

  /**
   * Get import status with details.
   * @param {object} req Request object.
   * @param {object} res Response object.
   */
  async getImportStatusWithDetails(req: Request, res: Response) {
    // Get params.
    const { importId } = matchedData(req, { locations: ['params'] });

    // Check import status.
    let statusWithDetails;
    try {
      statusWithDetails = await this.importBusiness.checkToImportStatusWithDetails(importId);
    } catch (error) {
      this.log.save('get-export-status-error', { importId, error: error?.message });
      return this.responseError(res, 'Can not get import status.');
    }

    // Return response.
    this.responseData(res, { importId, ...statusWithDetails });
  }
}

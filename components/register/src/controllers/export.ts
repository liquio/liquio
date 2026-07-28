import { matchedData } from 'express-validator';

import { Request, Response } from '../router';
import Controller from './controller';
import ExportBusiness from '../businesses/export';
import Log from '../lib/log';

/**
 * Export controller.
 */
export default class ExportController extends Controller {
  static singleton: ExportController;
  log: Log;

  exportBusiness: ExportBusiness;

  /**
   * Keys controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    // Define singleton.
    if (!ExportController.singleton) {
      super(config);
      this.log = Log.getInstance();
      this.exportBusiness = new ExportBusiness(config);
      ExportController.singleton = this;
    }
    return ExportController.singleton;
  }

  /**
   * Start preparing to export.
   */
  async startPreparingToExport(req: Request, res: Response) {
    // Get params.
    const { keyId, options = { onlySchema: false } } = matchedData(req, { locations: ['body'] });

    // Start preparing to export.
    let exportId;
    try {
      exportId = await this.exportBusiness.startPreparingToExport(keyId, options);
    } catch (error) {
      this.log.save('start-preparing-to-export-error', { keyId, error: error?.message });
      return this.responseError(res, 'Can not start preparing to export.');
    }

    // Return response.
    this.responseData(res, { keyId, exportId });
  }

  /**
   * Get export status.
   */
  async getExportStatus(req: Request, res: Response) {
    // Get params.
    const { exportId } = matchedData(req, { locations: ['params'] });

    // Check export status.
    let status = 'Not found';
    try {
      status = await this.exportBusiness.checkToExportStatus(exportId);
    } catch (error) {
      this.log.save('get-export-status-error', { exportId, error: error?.message });
      return this.responseError(res, 'Can not get export status.');
    }

    // Return response.
    this.responseData(res, { exportId, status });
  }

  /**
   * Get export data.
   */
  async getExportData(req: Request, res: Response) {
    // Get params.
    const { exportId } = matchedData(req, { locations: ['params'] });

    // Get data.
    let status;
    try {
      status = await this.exportBusiness.checkToExportStatus(exportId);
    } catch (error) {
      this.log.save('get-export-status-error', { exportId, error: error?.message });
      return this.responseError(res, 'Can not get export status.');
    }
    if (status !== ExportBusiness.Statuses.Prepared) {
      return this.responseError(res, 'Export data not ready.');
    }
    let data;
    try {
      data = await this.exportBusiness.getToExportData(exportId);
    } catch (error) {
      this.log.save('get-export-data-error', { exportId, error: error?.message });
      return this.responseError(res, 'Can not get export data.');
    }

    // Return data.
    const registerId = data.register.id;
    const keyId = data.key.id;
    const onlySchema = data.options?.onlySchema || false;
    const fileName = `register${onlySchema ? '-schema' : ''}-${registerId}-${keyId}.dat`;
    res.set('Content-Type', 'text/plain');
    res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(data);

    // Clear data.
    this.exportBusiness.clearToExport(exportId);
  }
}

const { Readable } = require('stream');
const ExcelJS = require('exceljs');

const { FILE_DOCUMENT_TEMPLATE_ID } = require('../../../constants/common');
const { ERROR_WRONG_METHOD } = require('../../../constants/error');
const Sandbox = require('../../../lib/sandbox');

/**
 * Event file.
 */
class EventFile {
  constructor() {
    // Define singleton.
    if (!EventFile.singleton) {
      this.sandbox = Sandbox.getInstance();
      EventFile.singleton = this;
    }

    return EventFile.singleton;
  }

  /**
   * Execute.
   * @param {object} options Options.
   */
  async execute(options) {
    // Get params.
    const { eventTemplateJsonSchemaObject } = options || {};

    let executedData;
    switch (eventTemplateJsonSchemaObject?.method) {
      case 'generateCsv':
        try {
          executedData = this.sandbox.evalWithArgs(
            eventTemplateJsonSchemaObject.map,
            [options.documents, options.events],
            { meta: { fn: 'map', caller: 'EventFile.execute' } },
          );
        } catch (error) {
          log.save('file-csv-generate|exception', {
            error: error?.message,
          });

          throw new global.EvaluateSchemaFunctionError(error.toString());
        }

        return await this.generateCsv(executedData, options);
      case 'generateXlsx':
        try {
          executedData = this.sandbox.evalWithArgs(
            eventTemplateJsonSchemaObject.map,
            [options.documents, options.events],
            { meta: { fn: 'map', caller: 'EventFile.execute' } },
          );
        } catch (error) {
          log.save('file-xlsx-generate|exception', {
            error: error?.message,
          });

          throw new global.EvaluateSchemaFunctionError(error.toString());
        }

        return await this.generateXlsx(executedData, options);

      default:
        throw new Error(ERROR_WRONG_METHOD);
    }
  }

  /**
   * Generate csv.
   * @param {object[]} data Data.
   * @param {{ filestorage }} options Options.
   */
  async generateCsv(data, { workflowId, eventTemplateId, filestorage, documentModel, eventModel }) {
    let fileBuffer;
    try {
      const csv = data.map((row) => Object.values(row).join(',')).join('\n');
      fileBuffer = Buffer.from(csv);
    } catch (error) {
      log.save('file-csv-generate|exception', {
        error: error?.message,
        data: { workflowId },
      });

      throw error;
    }

    let fileName = `file-csv-${workflowId}`;

    // Upload file to file storage.
    let fileInfo;
    try {
      fileInfo = await filestorage.uploadFileFromStream(Readable.from(fileBuffer), fileName, undefined, 'text/csv', undefined, true);
    } catch (error) {
      log.save('file-csv-filestorage-upload|exception', {
        error: error?.message,
        requestUrl: error?.details?.requestUrl,
        responseStatusCode: error?.response?.statusCode,
        responseBody: error?.response?.body || error?.details?.response,
      });

      error.details = {
        responseStatusCode: error?.response?.statusCode,
        responseBody: error?.response?.body || error?.details?.response,
      };

      throw error;
    }

    const { id: fileId, contentType, name } = fileInfo;

    // Check that is correct content type.
    if ('text/csv' !== contentType) {
      log.save('file-csv-filestorage-error|wrong-content-type', { contentType });
      throw new Error('File upload failed. Incorrect content type from external service.');
    }

    // Save document to database.
    fileName = name;
    let savedDocument;
    try {
      savedDocument = await documentModel.create({
        documentTemplateId: FILE_DOCUMENT_TEMPLATE_ID,
        fileId,
        fileName,
        fileType: contentType,
      });
    } catch (error) {
      log.save('file-csv-document-save|exception', {
        error: error && error.message,
        data: { workflowId },
      });

      throw error;
    }

    const { id: savedDocumentId } = savedDocument;
    if (!savedDocumentId) {
      throw new Error('Can not save document.');
    }

    // Add to event.
    const saveToEventResult = await eventModel.setDocumentIdByWorkflowIdAndEventTemplateId(workflowId, eventTemplateId, savedDocumentId);

    // Return saved document and save to event result.
    return { savedDocument, saveToEventResult };
  }

  /**
   * Generate xlsx.
   * @param {object[]} data Data.
   * @param {{ filestorage }} options Options.
   */
  async generateXlsx(data, { workflowId, eventTemplateId, filestorage, documentModel, eventModel }) {
    let fileBuffer;
    try {
      // Create workbook.
      const workbook = new ExcelJS.Workbook();

      for (const sheetData of data) {
        const worksheet = workbook.addWorksheet(sheetData.name);

        // Add header.
        worksheet.columns = Object.keys(sheetData.rows[0]).map((key) => ({
          header: key,
          key,
        }));

        // Add data.
        sheetData.rows.forEach((row) => {
          worksheet.addRow(Object.values(row));
        });
      }

      // Save workbook.
      fileBuffer = await workbook.xlsx.writeBuffer();
    } catch (error) {
      log.save('file-xlsx-generate|exception', {
        error: error?.message,
        data: { workflowId },
      });

      throw error;
    }

    let fileName = `file-xlsx-${workflowId}`;

    // Upload file to file storage.
    let fileInfo;
    try {
      fileInfo = await filestorage.uploadFileFromStream(
        Readable.from(fileBuffer),
        fileName,
        undefined,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        undefined,
        true,
      );
    } catch (error) {
      log.save('file-xlsx-filestorage-upload|exception', {
        error: error?.message,
        requestUrl: error?.details?.requestUrl,
        responseStatusCode: error?.response?.statusCode,
        responseBody: error?.response?.body || error?.details?.response,
      });

      error.details = {
        responseStatusCode: error?.response?.statusCode,
        responseBody: error?.response?.body || error?.details?.response,
      };

      throw error;
    }

    const { id: fileId, contentType, name } = fileInfo;

    // Check that is correct content type.
    if ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' !== contentType) {
      log.save('file-xlsx-filestorage-error|wrong-content-type', { contentType });
      throw new Error('File upload failed. Incorrect content type from external service.');
    }

    // Save document to database.
    fileName = name;
    let savedDocument;
    try {
      savedDocument = await documentModel.create({
        documentTemplateId: FILE_DOCUMENT_TEMPLATE_ID,
        fileId,
        fileName,
        fileType: contentType,
      });
    } catch (error) {
      log.save('file-xlsx-document-save|exception', {
        error: error && error.message,
        data: { workflowId },
      });

      throw error;
    }

    const { id: savedDocumentId } = savedDocument;
    if (!savedDocumentId) {
      throw new Error('Can not save document.');
    }

    // Add to event.
    const saveToEventResult = await eventModel.setDocumentIdByWorkflowIdAndEventTemplateId(workflowId, eventTemplateId, savedDocumentId);

    // Return saved document and save to event result.
    return { savedDocument, saveToEventResult };
  }
}

module.exports = EventFile;

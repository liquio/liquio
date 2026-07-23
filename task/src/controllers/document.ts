import crypto from 'node:crypto';
const { randomUUID } = crypto;
import axios from 'axios';
import _ from 'lodash';
import jcopy from 'jcopy';

import { JSONPath } from '../lib/jsonpath';
import { Controller } from './controller';
import DocumentAttachmentEntity from '../entities/document_attachment';
import DocumentModel from '../models/document';
import DocumentAttachmentModel from '../models/document_attachment';
import DocumentTemplateModel from '../models/document_template';
import DocumentSignatureModel from '../models/document_signature';
import DocumentSignatureRejectionModel from '../models/document_signature_rejection';
import TaskModel from '../models/task';
import TaskTemplateModel from '../models/task_template';
import WorkflowModel from '../models/workflow';
import StorageService from '../services/storage';
import FileGeneratorService from '../services/file_generator';
import DocumentUpdateLog from '../services/document_update_log';
import ExternalReader from '../lib/external_reader';
import DownloadToken from '../lib/download_token';
import PersistLink from '../lib/persist_link';
import Notifier from '../services/notifier';
import CustomLogs from '../services/custom_logs';
import Sandbox from '../lib/sandbox';
import { InvalidParamsError, BadRequestError, NotFoundError } from '../lib/errors';
import { ERROR_DOCUMENT_ALREADY_COMMITTED, ERROR_DRAFT_EXPIRED, ERROR_CAN_NOT_DELETE, ERROR_DOCUMENT_NOT_FOUND } from '../constants/error';

// Constants.
const QUERY_INDICATOR_TRUE = 'true';
const ERROR_DOCUMENT_STEP_NOT_DEFINED = 'Document step not defined.';
const ERROR_DOCUMENT_PATH_NOT_DEFINED = 'Document path not defined.';

/**
 * Document controller.
 */
export class DocumentController extends Controller {
  private static singleton: DocumentController;

  taskModel: any;
  taskTemplateModel: any;
  documentModel: any;
  documentAttachmentModel: any;
  documentTemplateModel: any;
  documentSignatureModel: any;
  documentSignatureRejectionModel: any;
  workflowModel: any;
  storageService: any;
  fileGeneratorService: any;
  documentUpdateLog: any;
  externalReader: any;
  downloadToken: any;
  persistLink: any;
  notifier: any;
  customLogs: any;
  sandbox: any;

  /**
   * Documents controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!DocumentController.singleton) {
      super(config);
      this.taskModel = new TaskModel();
      this.taskTemplateModel = new TaskTemplateModel();
      this.documentModel = new DocumentModel();
      this.documentAttachmentModel = new DocumentAttachmentModel();
      this.documentTemplateModel = new DocumentTemplateModel();
      this.documentSignatureModel = new DocumentSignatureModel();
      this.documentSignatureRejectionModel = new DocumentSignatureRejectionModel();
      this.workflowModel = new WorkflowModel();
      this.storageService = new StorageService();
      this.fileGeneratorService = new FileGeneratorService();
      this.documentUpdateLog = new DocumentUpdateLog();
      this.externalReader = new ExternalReader();
      this.downloadToken = new DownloadToken(config.download_token);
      this.persistLink = new PersistLink(config.persist_link);
      this.notifier = new Notifier();
      this.customLogs = new CustomLogs();
      this.sandbox = new Sandbox({});
      DocumentController.singleton = this;
    }
    return DocumentController.singleton;
  }

  /**
   * Get for sign by me.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getForSignByMe(req, res) {
    // Define params.
    const userId = this.getRequestUserId(req);

    // Get list.
    let documents;
    try {
      documents = await global.businesses.document.getForSignByUser(userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, documents);
  }

  /**
   * Check multisign
   * @param {object} req
   * @param {object} res
   */
  async multisignCheck(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userInfo = this.getRequestUserInfo(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const oauthToken = this.getRequestUserAccessToken(req);

    // Get document.
    try {
      const [document] = await this.documentModel.getByIds(documentId);
      if (!document) {
        return this.responseError(res, new NotFoundError(ERROR_DOCUMENT_NOT_FOUND));
      }

      const {
        jsonSchema: { multisignCheck },
      } = await this.documentTemplateModel.findById(document.documentTemplateId);

      if (!multisignCheck) {
        return this.responseData(res, { check: true, message: 'multisignCheck is not defined' });
      }

      const { context: checkContext = [], errors: checkErrors = [], excludeOwner, isEnabled } = multisignCheck;

      if (
        isEnabled &&
        typeof isEnabled === 'string' &&
        !this.sandbox.evalWithArgs(isEnabled, [document.data, userInfo], {
          meta: { fn: 'multisignCheck.isEnabled', documentId },
        })
      ) {
        return this.responseData(res, {
          check: true,
          message: 'disabled by isEnabled parameter',
        });
      }

      if (excludeOwner && document.ownerId === userInfo.userId) {
        return this.responseData(res, { check: true, message: 'disabled by excludeOwner parameter' });
      }

      const context = await checkContext.reduce(async (accPromise, { name, provider, options }) => {
        const acc = await accPromise;
        const [providerType, service, method] = provider.split('.');

        let providerData;
        switch (providerType) {
          case 'external-reader': {
            const nonUserFilter = this.sandbox.evalWithArgs(options, [document.data], {
              meta: { fn: 'multisignCheck.nonUserFilter', documentId, name },
            });
            const dataByUser = await this.externalReader.getDataByUser(
              service,
              method,
              undefined,
              oauthToken,
              userInfo,
              nonUserFilter,
              undefined,
              userUnitIds,
            );
            providerData = dataByUser.data;
          }
        }

        return { ...acc, [name]: providerData };
      }, Promise.resolve({ user: userInfo }));

      const errors = checkErrors.filter(({ check }) =>
        this.sandbox.evalWithArgs(check, [document.data, context], { meta: { fn: 'multisignCheck.check', documentId } }),
      );
      if (!errors.length) {
        return this.responseData(res, { check: true });
      }

      const [firstError] = errors;
      return this.responseError(res, 'Multisign check failed', undefined, [firstError.title, firstError.text].filter(Boolean).join(': '));
    } catch (error) {
      return this.responseError(res, 'Multisign check error', undefined, error.message);
    }
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Get document.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check attachments placeholders.
    const attachmentsPlaceholdersArray = JSONPath('$..[?(@.isAttachmentPlaceholder === true)]', document.data);
    if (attachmentsPlaceholdersArray.length > 0) {
      return this.responseError(res, 'Document contains unexpectedly stopped attachment loading process.', 500, attachmentsPlaceholdersArray);
    }

    // Get and append attachments.
    const attachments = await this.documentAttachmentModel.getByDocumentId(documentId);
    document.attachments = attachments;

    this.responseData(res, this.filterResponse(document));
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findByIdWithBasicAuth(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const externalUser = this.getRequestExternalUser(req);

    // Get document.
    let document;
    try {
      document = (await this.documentModel.getByIds(documentId))[0];
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!document) {
      return this.responseError(res, new NotFoundError(ERROR_DOCUMENT_NOT_FOUND));
    }

    // Check access for Basic auth.
    const { getDocumentWithTemplateIdsByUser = {} } = global.config.external_services;
    const getDocumentWithTemplateIds = getDocumentWithTemplateIdsByUser[externalUser] || [];
    const { documentTemplateId } = document;
    if (!getDocumentWithTemplateIds.includes(documentTemplateId)) {
      return this.responseError(
        res,
        'Document with this template ID not allowed to get by current external service user. Check config "external_services", property "getDocumentWithTemplateIdsByUser".',
        401,
        {
          externalUser,
          allowedDocumentWithTemplateIds: getDocumentWithTemplateIds,
          requestedDocumentTemplateId: documentTemplateId,
        },
      );
    }

    // Get and append attachments.
    const attachments = await this.documentAttachmentModel.getByDocumentId(documentId);
    document.attachments = attachments;

    this.responseData(res, this.filterResponse(document));
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    try {
      // Define params.
      const documentId = req.params.id;
      const lastUpdateLogId = req.query.last_update_log_id;
      const userId = this.getRequestUserId(req);
      const path = req.body.path;
      const value = req.body.value;
      const previousValue = req.body.previousValue;
      const properties = req.body.properties || [];
      const userUnitIds = this.getRequestUserUnitIds(req);
      if (path) {
        properties.push({ path, value, previousValue });
      }

      // Check if last log ID defined but can not be handled.
      if (lastUpdateLogId && !this.documentUpdateLog.enabled) {
        throw new InvalidParamsError('Update log disabled and can not be handled.');
      }

      // Check property path.
      const invalidPathPart = (pathPart) => pathPart === '' || !pathPart.match(/^[a-zA-Zа-яА-ЯіІїЇ0-9_]+$/);
      const invalidPath = (path) => typeof path !== 'string' || path.split('.').some(invalidPathPart);
      if (properties.some((v) => invalidPath(v.path))) {
        throw new InvalidParamsError('Invalid property path.', { cause: properties });
      }

      // Check draft expired.
      if (await global.models.task.checkDraftExpirationByDocumentId(documentId)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }

      // Update document.
      const updatedDocument = await (global.businesses.document.update as any)(documentId, properties, userId, userUnitIds);

      // Check reassign trigger and handle document update log.
      const [checkReassignTriggerResult, documentUpdateLogEntities] = await Promise.all([
        global.businesses.task.checkReassignTrigger(updatedDocument.documentTemplateId, documentId, properties, userId),
        this.documentUpdateLog.handleDocumentUpdate(updatedDocument, properties, userId, lastUpdateLogId),
      ]);

      let updatedDocumentToReturn = this.filterResponse(updatedDocument);
      const updateLogsDataToReturn: any = { updateLogs: documentUpdateLogEntities };

      if (!lastUpdateLogId) {
        updateLogsDataToReturn.document = updatedDocumentToReturn;
      }
      if (documentUpdateLogEntities && documentUpdateLogEntities.every((v) => v.id !== lastUpdateLogId)) {
        updateLogsDataToReturn.document = updatedDocumentToReturn;
        updateLogsDataToReturn.updateLogs =
          updateLogsDataToReturn.updateLogs.length > 1 ? [updateLogsDataToReturn.updateLogs[0]] : updateLogsDataToReturn.updateLogs;
      }

      if (checkReassignTriggerResult) {
        updateLogsDataToReturn.isTaskReassigned = true;
        updateLogsDataToReturn.newPerformerUserIds = checkReassignTriggerResult.newPerformerUserIds;
        updatedDocumentToReturn = {
          document: updatedDocumentToReturn,
          isTaskReassigned: true,
          newPerformerUserIds: checkReassignTriggerResult.newPerformerUserIds,
        };
      }

      updateLogsDataToReturn.updateLogs = global.businesses.document.addCalculatedDataToUpdateLogs(updateLogsDataToReturn);

      this.responseData(res, documentUpdateLogEntities ? updateLogsDataToReturn : updatedDocumentToReturn);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'update-document',
        request: res.responseMeta,
        document: updatedDocument,
        requestBody: req.body,
      });

      // Inform performer users.
      if (checkReassignTriggerResult) {
        global.businesses.task.informNewPerformerUsers(checkReassignTriggerResult.task, checkReassignTriggerResult.newPerformerUserIds);
      }
    } catch (error) {
      global.log.save('update-document-error', { message: error.toString(), cause: error.cause, stack: error.stack });
      return this.responseError(res, error);
    }
  }

  /**
   * Prepare.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async prepare(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Prepare document.
    try {
      await global.businesses.document.prepare(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    // Get document.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Get and append attachments.
    const attachments = await this.documentAttachmentModel.getByDocumentId(documentId);
    document.attachments = attachments;

    this.responseData(res, this.filterResponse(document));
  }

  /**
   * Validate.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async validate(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userInfo = this.getRequestUserInfo(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Validate document.
    let validDocument;
    try {
      const includesUnexpectedErrors = true;
      validDocument = await global.businesses.document.validate(documentId, userInfo, userUnitIds, includesUnexpectedErrors);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    // Check draft expired.
    try {
      if (await global.models.task.checkDraftExpirationByDocumentId(documentId)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    const { commit } = req.query;
    if (commit === QUERY_INDICATOR_TRUE) {
      try {
        const userId = this.getRequestUserId(req);
        const userUnits = this.getRequestUserUnitEntities(req);
        const requestMeta = this.getRequestMeta(req);
        const document = await global.models.document.findById(documentId, true);
        const { id: taskId } = (document as any).task;
        const finishedTask = await global.businesses.task.setStatusFinished(
          taskId,
          userId,
          userUnitIds,
          false,
          { user: userInfo, units: userUnits },
          requestMeta,
        );

        // Send message to RabbitMQ.
        const message = { workflowId: finishedTask.workflowId, taskId: taskId };
        global.messageQueue.produce(message);

        global.businesses.userInbox.sendToInboxesIfNeedIt(finishedTask);
      } catch (error) {
        return this.responseError(res, error, error.httpStatusCode, error.details);
      }
    }

    this.responseData(res, validDocument);
  }

  /**
   * Set sign rejection.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setSignRejection(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const { rejectReason } = req.body;
    const userId = this.getRequestUserId(req);
    const userInfo = this.getRequestUserInfo(req);

    // Check access to task as signer.
    let task;
    try {
      task = await global.businesses.task.findByDocumentIdAsSigner(documentId, userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check draft expired.
    try {
      if (global.businesses.task.checkDraftExpired(task)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    const { id: taskId, signerUsers = [], performerUsers = [] } = task;
    const filteredSigners = signerUsers.concat(performerUsers).filter((v) => v !== userId);

    const userName = `${userInfo.lastName.trim()} ${userInfo.firstName.trim()}${userInfo.middleName ? ' ' + userInfo.middleName.trim() : ''}`;

    // Add signature rejection.
    const documentSignatureRejection = await this.documentSignatureRejectionModel.create({
      documentId,
      userId,
      data: { rejectReason, userName },
      createdBy: userId,
    });

    try {
      await global.businesses.document.declineMultisigns(filteredSigners, taskId, documentId, userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Add multiSignInfo.

    await global.businesses.document.addMultiSignInfo(task, { userInfo, type: 'reject' });

    this.responseData(res, this.filterResponse(documentSignatureRejection));
  }

  /**
   * Get PDF.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getPdf(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const { preview } = req.query;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check access to document.
    let document;
    let fileLink;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
      ({ fileId: fileLink } = document);
      if (fileLink === 'generating') {
        return this.responseThatAccepted(res);
      }

      if (!fileLink) {
        throw new NotFoundError('File link not found.');
      }
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    // Get readable stream.
    let downloadFileRequestOptions;
    try {
      if (preview === QUERY_INDICATOR_TRUE) {
        downloadFileRequestOptions = await this.storageService.provider.downloadFilePreviewRequestOptions(fileLink);
      } else {
        downloadFileRequestOptions = await this.storageService.provider.downloadFileRequestOptions(fileLink);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'stream',
    });
    response.data.pipe(res);
  }

  /**
   * Create PDF.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createPdf(req, res) {
    let document;
    let pdfBuffer;
    try {
      // Define params.
      const documentId = req.params.id;
      const userId = this.getRequestUserId(req);
      const userUnitIds = this.getRequestUserUnitIds(req);

      // Check access to document.
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);

      // Check document already commited.
      const { isFinal } = document;
      if (isFinal) {
        throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
      }

      if (req.query.large_file) {
        await global.businesses.document.addGeneratingPdfToQueue(document, userId);

        return this.responseThatAccepted(res);
      }
      pdfBuffer = await global.businesses.document.createPdf({ document, userId });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseFile(res, pdfBuffer, 'application/pdf');

    // Save custom logs.
    this.customLogs.saveCustomLog({ operationType: 'generate-pdf', request: res.responseMeta, document });
  }

  /**
   * Create large PDF.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createLargePdf(req, res) {
    let document;
    try {
      // Define params.
      const documentId = req.params.id;
      const userId = this.getRequestUserId(req);
      const userUnitIds = this.getRequestUserUnitIds(req);

      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);

      await global.businesses.document.addGeneratingPdfToQueue(document, userId);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);

    // Save custom logs.
    this.customLogs.saveCustomLog({ operationType: 'generate-large-pdf', request: res.responseMeta, document });
  }

  /**
   * Add attachment.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async addAttachment(req, res) {
    // Define how to normalize file name.
    const normalizeFileName = (fileName) => `${fileName}`.replace(/[?/\\:"']/g, '_');

    // Define params.
    const documentId = req.params.id;
    const originalFileName = normalizeFileName(req.query.file_name);
    const labels = (Array.isArray(req.query.labels) ? req.query.labels : [req.query.labels || '']).filter((v) => !!v);
    const metaString = req.query.meta ? decodeURIComponent(req.query.meta) : '{}';
    const meta = JSON.parse(metaString);
    const documentPath = req.query.document_path;
    const contentType = req.query.content_type || req.headers['content-type'];
    const contentLength = req.query.content_length || req.headers['content-length'];
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check file extensions.
    if (
      !global.config.documents?.allowedFileExtensions?.some((allowedFileExtension) => originalFileName.toUpperCase().endsWith(allowedFileExtension))
    ) {
      return this.responseError(res, 'Invalid file extensions', 400);
    }

    // Check meta.
    if (typeof meta !== 'object') {
      return this.responseError(res, 'Invalid file meta', 400);
    }

    // Check access to document.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Upload file.
    let fileInfo;
    try {
      fileInfo = await this.storageService.provider.uploadFileFromStream(req, originalFileName, undefined, contentType, contentLength);
    } catch (error) {
      return this.responseError(res, error);
    }
    const { id: fileId } = fileInfo;

    // Save placeholder to document data if need it.
    const attachmentPlaceholder = DocumentAttachmentEntity.getPlaceholder(fileId, documentPath);
    await global.businesses.document.saveAttachmentToDocumentData(attachmentPlaceholder, documentPath, document, userId, userUnitIds);

    // Add to DB.
    let attachment;
    try {
      attachment = await this.documentAttachmentModel.create({
        documentId,
        name: originalFileName,
        type: contentType,
        size: contentLength,
        link: fileId,
        labels,
        meta,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    // Save to document data if need it.
    await global.businesses.document.saveAttachmentToDocumentData(attachment, documentPath, document, userId, userUnitIds);

    this.responseData(res, attachment);

    // Save custom logs.
    this.customLogs.saveCustomLog({ operationType: 'add-attach', request: res.responseMeta, document });
  }

  /**
   * Get attachment.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAttachment(req, res) {
    // Define params.
    const { id: documentId, attachment_id: attachmentId } = req.params;
    const isInvalid = (param) => !param || param === 'undefined';
    if (isInvalid(documentId) || isInvalid(attachmentId)) {
      return this.responseError(res, 'Document ID and Attachment ID should be defined.', 400);
    }

    const { preview, p7s } = req.query;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check access to document.
    try {
      await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Get readable stream.
    let downloadFileRequestOptions;
    try {
      const { fileLink } = await (global.businesses.document.getAttachmentFileLink as any)(documentId, attachmentId, userId);
      if (preview === QUERY_INDICATOR_TRUE) {
        downloadFileRequestOptions = await this.storageService.provider.downloadFilePreviewRequestOptions(fileLink);
      } else if (p7s === QUERY_INDICATOR_TRUE) {
        downloadFileRequestOptions = await this.storageService.provider.getP7sSignatureRequestOptions(fileLink, true);
      } else {
        downloadFileRequestOptions = await this.storageService.provider.downloadFileRequestOptions(fileLink);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'stream',
    });
    response.data.pipe(res);
  }

  /**
   * Get attachment ZIP.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAttachmentsZip(req, res) {
    // Define params.
    const documentId = req.params.id;
    if (!documentId || documentId === 'undefined') {
      return this.responseError(res, 'Document ID should be defined.', 400);
    }

    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Get document and check access to document.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Define files links.
    const { fileId: mainFileLink } = document || {};
    const attachmentsLinks = await global.businesses.document.getAttachmentFilesLinks(documentId);
    const documentFilesLinks = [mainFileLink, ...attachmentsLinks].filter((v) => !!v);
    if (documentFilesLinks.length === 0) {
      return this.responseError(res, 'Document without files.', 404);
    }

    // Get readable stream.
    let downloadFileRequestOptions;
    try {
      downloadFileRequestOptions = await this.storageService.provider.downloadZipRequestOptions(documentFilesLinks);
    } catch (error) {
      return this.responseError(res, error);
    }

    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'stream',
    });
    response.data.pipe(res);
  }

  /**
   * Get ASIC.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAsic(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Get document and check access to document.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Get existing ASIC manifest.
    const asicInfo = document.asic || {};
    const { asicmanifestFileId, filesIds } = asicInfo;

    // Get readable stream.
    let downloadFileRequestOptions;
    try {
      downloadFileRequestOptions = await this.storageService.provider.createAsicRequestOptions(asicmanifestFileId, filesIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'stream',
    });
    response.data.pipe(res);
  }

  /**
   * Delete attachment.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteAttachment(req, res) {
    // Define params.
    const documentId = req.params.id;
    const attachmentId = req.params.attachment_id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check access to document.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
      if (document.isFinal) {
        throw new Error(ERROR_CAN_NOT_DELETE);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    // Delete attachment from DB.
    try {
      await global.businesses.document.deleteAttachment(documentId, attachmentId, userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseThatAccepted(res);

    // Save custom logs.
    this.customLogs.saveCustomLog({ operationType: 'remove-attach', request: res.responseMeta, document });
  }

  /**
   * Get data for sign.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getDataForSign(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check access to document.
    try {
      await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Get data for sign.
    let dataForSign;
    try {
      const dataForSignWithFileIds: any = await global.businesses.document.getDataForSign(documentId);
      dataForSign = dataForSignWithFileIds.map((v: any) => v.dataForSign);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, dataForSign);
  }

  /**
   * Sign.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async sign(req, res) {
    try {
      const documentId = req.params.id;
      const signature = req.body.signature || '';
      const type = req.query.type || null;
      const isSignTest = req.query.is_sign_test || false;
      const userId = this.getRequestUserId(req);
      const userUnitIds = this.getRequestUserUnitIds(req);
      const userUnits = this.getRequestUserUnitEntities(req);
      const userInfo = this.getRequestUserInfo(req);
      const { token } = req.headers;
      const isUserPemCouldBeMock = this.isUserPemCouldBeMock(token);
      const isUserSignatureCouldBeMock = isSignTest && this.isUserSignatureCouldBeMock(token);
      global.log.save('document-sign-started-by-user', userInfo);

      // Check type.
      const allowedTypes = ['file', 'hardware'];
      if (type && !allowedTypes.includes(type)) {
        return this.responseError(res, `Incorrect signature type. Allowed: ${allowedTypes.join(', ')}.`);
      }

      // Check access to document.
      let document;
      try {
        const strict = false;
        const doNotCheckAccess = false;
        document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, strict, doNotCheckAccess);
      } catch (error) {
        return this.responseError(res, error);
      }

      // Check ability to sign.
      const { task } = document || {};
      const signers = task && task.signerUsers;
      const performerUsers = task && task.performerUsers;
      const signatures = document && document.signatures;

      // Check draft expired.
      try {
        if (global.businesses.task.checkDraftExpired(task)) {
          throw new BadRequestError(ERROR_DRAFT_EXPIRED);
        }
      } catch (error) {
        return this.responseError(res, error);
      }

      // Check sign available.
      let isSignAvailable;
      try {
        isSignAvailable = await global.businesses.document.isSignAvailable(document, userInfo, userUnits);
      } catch (error) {
        return this.responseError(res, error);
      }
      if (!isSignAvailable) {
        return this.responseError(res, 'Sign not available.', 400);
      }

      // Define send letter to signer context.
      const sendLetterToSignerContext = { document, task, signers, userId };

      // Check strict sequential sign.
      if (signers.length) {
        const nextSignerUserId = await global.businesses.document.checkSignersOrderAndGetNextSigner({ task, document });
        if (nextSignerUserId && nextSignerUserId !== userId) {
          return this.responseError(res, 'User cannot sign according to strict sign order');
        }
      }

      // Get signed document.
      let signedDocument;
      try {
        signedDocument = await global.businesses.document.sign(
          documentId,
          signature,
          userId,
          isUserPemCouldBeMock,
          isUserSignatureCouldBeMock,
          userInfo,
          sendLetterToSignerContext,
          type,
        );
      } catch (error) {
        return this.responseError(res, error, 500, error.details);
      }

      // Handle multi sign notification.
      if (signers.length) {
        try {
          const nextSignerUserId = await global.businesses.document.checkSignersOrderAndGetNextSigner({ task, document });
          if (nextSignerUserId) {
            // It`s strict sequential sign - inform only next signer.
            await global.businesses.document.sendLetterToNextSigner({ task, document, nextSignerUserId });
          } else if (!signatures.length && performerUsers.includes(userId)) {
            // It`s regular sign and it`s initiator (first signer) request - inform all signers one time.
            await (global.businesses.document.sendLetterToSigners as any)(document, task, signers, userId);
          }
        } catch (error) {
          global.log.save('send-letter-to-signers-error', { error });
          // Reset signs from document.
          await global.models.documentSignature.deleteByDocumentId(documentId);
          return this.responseError(res, error);
        }
      }

      const { commit } = req.query;
      if (commit === QUERY_INDICATOR_TRUE) {
        // Check that all users signed all files.
        try {
          await global.businesses.document.checkP7SSignaturesCount(signedDocument);
        } catch (error) {
          return this.responseError(res, error.message, 500, error.details);
        }

        try {
          const requestMeta = this.getRequestMeta(req);
          const { id: taskId } = task;
          const finishedTask = await global.businesses.task.setStatusFinished(
            taskId,
            userId,
            userUnitIds,
            false,
            { user: userInfo, units: userUnits },
            requestMeta,
          );

          // Send message to RabbitMQ.
          const message = { workflowId: finishedTask.workflowId, taskId: taskId };
          global.messageQueue.produce(message);

          global.businesses.userInbox.sendToInboxesIfNeedIt(finishedTask);
        } catch (error) {
          return this.responseError(res, error, error.httpStatusCode, error.details);
        }
      }

      this.responseData(res, signedDocument);

      // Save custom logs.
      this.customLogs.saveCustomLog({ operationType: 'sign', request: res.responseMeta, document: signedDocument });
    } catch (error) {
      global.log.save('sign-document-error', { message: error.toString(), cause: error.cause, stack: error.stack });
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }
  }

  /**
   * Continue sign.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async continueSign(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const userUnits = this.getRequestUserUnitEntities(req);
    const userInfo = this.getRequestUserInfo(req);
    global.log.save('document-continue-sign-started-by-user', userInfo);

    // Check access to document.
    let document;
    try {
      const strict = false;
      const doNotCheckAccess = false;
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, strict, doNotCheckAccess);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check ability to sign.
    const { task } = document || {};
    const signers = task && task.signerUsers;

    // Check draft expired.
    try {
      if (global.businesses.task.checkDraftExpired(task)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check continue sign available.
    let isSignAvailable;
    try {
      isSignAvailable = await global.businesses.document.isContinueSignAvailable(document, userInfo, userUnits);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!isSignAvailable) {
      return this.responseError(res, 'Continue sign not available.', 400);
    }

    // Inform signers if need it.
    try {
      await global.businesses.document.sendLetterToSigners(document, task, signers, userId, false, false, true);
    } catch (error) {
      global.log.save('send-letter-to-signers-by-continue-sign-error');
      return this.responseError(res, error);
    }

    // Set `signWithoutPerformerAvailable: true` in task data.
    try {
      await global.models.task.setSignWithoutPerformerAvailable(task.id, userId, true);
    } catch (error) {
      global.log.save('set-sign-without-performer-available-error');
      return this.responseError(res, error);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Get data for sign P7S.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getDataForSignP7s(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const { attachment_id: attachmentId } = req.query;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check access to document.
    try {
      await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Get data for sign.
    let dataForSign;
    let fileName;
    try {
      const dataForSignP7s = await global.businesses.document.getDataForSignP7s(documentId, attachmentId, userId);
      dataForSign = dataForSignP7s.p7s;
      fileName = dataForSignP7s.fileName;
    } catch (error) {
      if (error.message === 'User already signed this file (P7S).') {
        return this.responseError(res, 'User already signed this file (P7S).', 409);
      }
      return this.responseError(res, error);
    }

    // Response as buffer if need it.
    const dataForSignIsBuffer = Buffer.isBuffer(dataForSign);
    if (dataForSignIsBuffer) {
      return this.responseFile(res, dataForSign, 'application/pkcs7-mime', `${fileName}.p7s`);
    }

    // Response as stream in other cases.
    dataForSign.pipe(res);
  }

  /**
   * Sign P7S.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async signP7s(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const { attachment_id: attachmentId } = req.query;
    const isSignTest = req.query.is_sign_test || false;
    const { p7sSignature } = req.body;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const userInfo = this.getRequestUserInfo(req);
    const { token } = req.headers;
    const isUserSignatureCouldBeMock = isSignTest && this.isUserSignatureCouldBeMock(token);
    global.log.save('document-sign-p7s-started-by-user', userInfo);

    // Check access to document first.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check draft expired.
    try {
      if (await global.models.task.checkDraftExpirationByDocumentId(documentId)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    let documentTemplate;

    // Check document template.
    try {
      documentTemplate = await global.models.documentTemplate.findById(document.documentTemplateId);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check strict sequential sign.
    if (document.task.signerUsers?.length) {
      const nextSignerUserId = await global.businesses.document.checkSignersOrderAndGetNextSigner({ task: document.task, document });
      if (nextSignerUserId && nextSignerUserId !== userId) {
        return this.responseError(res, 'User cannot sign (P7S) according to strict sign order');
      }
    }

    const { isExternalP7sSign } = documentTemplate?.jsonSchema || {};

    // P7S sign.
    let p7sSignatureResult;
    try {
      p7sSignatureResult = await global.businesses.document.signP7s(
        documentId,
        attachmentId,
        p7sSignature,
        isUserSignatureCouldBeMock,
        userInfo,
        isExternalP7sSign,
      );
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, p7sSignatureResult);
  }

  /**
   * Get additional data for sign P7S.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAdditionalDataForSignP7s(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const userId = this.getRequestUserId(req);
    const userInfo = this.getRequestUserInfo(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check access to document.
    try {
      await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Get additional data for sign.
    let additionalDataForSignP7s;
    try {
      additionalDataForSignP7s = await global.businesses.document.getAdditionalDataForSignP7s(documentId, false, userInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Response as stream in other cases.
    this.responseData(res, additionalDataForSignP7s);
  }

  /**
   * Sign additional P7S.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async signAdditionalP7s(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const isSignTest = req.query.is_sign_test || false;
    const { p7sSignature, cryptCertificate } = req.body;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const userInfo = this.getRequestUserInfo(req);
    const { token } = req.headers;
    const isUserSignatureCouldBeMock = isSignTest && this.isUserSignatureCouldBeMock(token);
    global.log.save('document-sign-additional-p7s-started-by-user', userInfo);

    // Check access to document.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check strict sequential sign.
    if (document.task.signerUsers?.length) {
      const nextSignerUserId = await global.businesses.document.checkSignersOrderAndGetNextSigner({ task: document.task, document });
      if (nextSignerUserId && nextSignerUserId !== userId) {
        return this.responseError(res, 'User cannot sign (additional P7S) according to strict sign order');
      }
    }

    // P7S additional sign.
    let p7sSignatureResult;
    try {
      p7sSignatureResult = await global.businesses.document.signAdditionalP7s(
        documentId,
        p7sSignature,
        isUserSignatureCouldBeMock,
        userInfo,
        cryptCertificate,
      );
    } catch (error) {
      if (error.message === 'User already signed document additional data.') {
        return this.responseError(res, 'User already signed document additional data.', 409);
      }
      return this.responseError(res, error, 500, error.details);
    }

    // Response.
    this.responseData(res, p7sSignatureResult);
  }

  /**
   * Get data to encrypt.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getDataToEncrypt(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check access to document.
    try {
      await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Get data to encrypt and certificate.
    let toEncrypt;
    try {
      toEncrypt = await global.businesses.document.getDataToEncrypt(documentId);
    } catch (error) {
      this.responseError(res, error);
    }
    const { encryptCert } = global.config.encrypt;

    // Response data to encrypt and certificate.
    this.responseData(res, { toEncrypt, encryptCert });
  }

  /**
   * Save encrypted data.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async saveEncryptedData(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const { encrypted: encryptedItems = [] } = req.body;
    if (!encryptedItems) {
      return this.responseError(res, 'Encrypted data not defined.');
    }
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check access to document.
    try {
      await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Save encrypted data.
    const { encryptCert } = global.config.encrypt;
    try {
      await global.businesses.document.saveEncryptedData(documentId, encryptedItems, encryptCert);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Response saving indicator.
    this.responseData(res, { saved: true });
  }

  /**
   * Get files to preview.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getFilesToPreview(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const { step } = req.query;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check params.
    if (!step) {
      return this.responseError(res, new BadRequestError(ERROR_DOCUMENT_STEP_NOT_DEFINED));
    }

    // Get files to preview.
    let filesToPreview;
    try {
      filesToPreview = await global.businesses.document.getFilesToPreviewAndCheckAccess(documentId, step, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Response.
    this.responseData(res, filesToPreview);
  }

  /**
   * Get direct files to preview.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getDirectFilesToPreview(req, res) {
    // Define params.
    const { id: documentId } = req.params;
    const { path } = req.query;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Check params.
    if (!path) {
      return this.responseError(res, new BadRequestError(ERROR_DOCUMENT_PATH_NOT_DEFINED));
    }

    // Get files to preview.
    let directFilesToPreview;
    try {
      const isDirect = true;
      directFilesToPreview = await global.businesses.document.getFilesToPreviewAndCheckAccess(documentId, path, userId, userUnitIds, isDirect);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Response.
    this.responseData(res, directFilesToPreview);
  }

  /**
   * Get file to preview.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getFileToPreview(req, res) {
    // Define params.
    const { download_token: downloadToken } = req.params;
    const { preview, asics, p7s } = req.query;

    // Define file link.
    let fileLink;
    try {
      fileLink = this.downloadToken.decrypt(downloadToken);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Get readable stream.
    let downloadFileRequestOptions;
    try {
      if (preview === QUERY_INDICATOR_TRUE) {
        downloadFileRequestOptions = await this.storageService.provider.downloadFilePreviewRequestOptions(fileLink);
      } else {
        if (asics === QUERY_INDICATOR_TRUE) {
          downloadFileRequestOptions = await this.storageService.provider.downloadFileAsicsRequestOptions(fileLink);
        } else if (p7s === QUERY_INDICATOR_TRUE) {
          downloadFileRequestOptions = await this.storageService.provider.getP7sSignatureRequestOptions(fileLink, true);
        } else {
          downloadFileRequestOptions = await this.storageService.provider.downloadFileRequestOptions(fileLink);
        }
      }
    } catch (error) {
      return this.responseError(res, error);
    }
    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'stream',
    });
    response.data.pipe(res);
  }

  /**
   * Upload file.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async uploadFile(req, res) {
    // Define params.
    const originalFileName = req.query.file_name;
    const contentType = req.query.content_type || req.headers['content-type'];
    const contentLength = req.query.content_length || req.headers['content-length'];

    // Upload file.
    let fileInfo;
    try {
      fileInfo = await this.storageService.provider.uploadFileFromStream(req, originalFileName, undefined, contentType, contentLength);
    } catch (error) {
      return this.responseError(res, error);
    }
    const { id: fileId } = fileInfo;

    // Define URL and create Persist Link record.
    const preparedHash = Buffer.from(fileId + crypto.randomBytes(4).toString('utf8'), 'utf8').toString('hex');
    let link;
    try {
      link = await this.persistLink.getLinkToStaticFileInFilestorage(fileId, preparedHash);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Prepare and response uploaded file info.
    const plinkFileInfo = { url: link, fileId };
    this.responseData(res, plinkFileInfo);
  }

  /**
   * calcBackTriggered.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async calcBackTriggered(req, res) {
    // Define params.
    const documentId = req.params.id;
    const propertyPath = req.body.path;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const properties = [];

    if (!propertyPath) {
      global.log.save('document-calc-back-triggered-empty-path-error', { propertyPath }, 'error');
      return this.responseError(res, 'Empty path.', 400);
    }

    // Retrieve data
    let document;
    let workflowDocuments;
    let workflow;
    let jsonSchema;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
      workflow = await this.workflowModel.findById(document.task.workflowId);
      const task = await global.businesses.task.findByIdAndCheckAccess(document.task.id, userId, userUnitIds);
      task.setIsMeSignerAndPerformer(userId, userUnitIds.all);
      workflowDocuments = await this.taskModel.getDocumentsByWorkflowId(workflow.id);
      const taskTemplate = await this.taskTemplateModel.findById(task.taskTemplateId);
      const documentTemplate = await this.documentTemplateModel.findById(taskTemplate.documentTemplateId);
      jsonSchema = documentTemplate.jsonSchema;
    } catch (error) {
      global.log.save('document-calc-back-triggered-retrieving-data-error', error, 'error');
      return this.responseError(res, 'Fetching data error.');
    }

    // Calculate
    const schemaPropertyPath = 'properties.' + propertyPath.split('.').join('.properties.');
    let valueToSet;
    const itemSchema = _.get(jsonSchema, schemaPropertyPath);
    if (!itemSchema || !itemSchema.calcBackTriggered || typeof itemSchema.calcBackTriggered !== 'string') {
      global.log.save('document-calc-back-triggered-schema-error', { itemSchema }, 'error');
      return this.responseError(res, 'Schema error.', 400);
    }
    try {
      valueToSet = this.sandbox.evalWithArgs(itemSchema.calcBackTriggered, [jcopy(document.data), jcopy(workflowDocuments), jcopy(workflow)], {
        meta: { fn: 'calcBackTriggered', documentId, propertyPath },
      });
    } catch (error) {
      global.log.save('document-calc-back-triggered-calculating-error', error, 'error');
      return this.responseError(res, 'Calculation error.');
    }
    if (propertyPath) {
      properties.push({ path: propertyPath, value: valueToSet });
    }

    // Update document.
    let updatedDocument;
    try {
      updatedDocument = await (global.businesses.document.update as any)(documentId, properties, userId, userUnitIds);
    } catch (error) {
      global.log.save('document-calc-back-triggered-update-error', error, 'error');
      return this.responseError(res, 'Document updating error.');
    }

    this.responseData(res, this.filterResponse(updatedDocument));
  }

  /**
   * Delete document signs.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteDocumentSigns(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const userInfo = this.getRequestUserInfo(req);

    // Check access to document.
    let document;
    try {
      document = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
      if (document.isFinal) {
        throw new Error('Document is final. Can not delete signs.');
      }
    } catch (error) {
      global.log.save('delete-signs-document-access-error', error, 'error');
      return this.responseError(res, error);
    }

    // Check draft expired.
    try {
      if (await global.models.task.checkDraftExpirationByDocumentId(documentId)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    // Delete signs from document.
    try {
      await global.models.documentSignature.deleteByDocumentId(documentId);
    } catch (error) {
      global.log.save('delete-document-signs-error', error, 'error');
      return this.responseError(res, error);
    }

    // Delete signs rejections.
    try {
      await this.documentSignatureRejectionModel.deleteByDocumentId(documentId);
    } catch (error) {
      global.log.save('delete-document-signs-rejection-error', error, 'error');
      return this.responseError(res, error);
    }

    // Delete the signatures of additional data.
    try {
      await global.models.additionalDataSignature.deleteByDocumentId(documentId);
    } catch (error) {
      global.log.save('delete-additional-data-signature-error', error, 'error');
      return this.responseError(res, error);
    }

    // Set `signWithoutPerformerAvailable: true` in task data.
    try {
      await global.models.task.setSignWithoutPerformerAvailableByDocumentId(documentId, userId, false);
    } catch (error) {
      global.log.save('set-sign-without-performer-available-error');
      return this.responseError(res, error);
    }

    let updatedDocument;
    try {
      updatedDocument = await global.businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    } catch (error) {
      global.log.save('delete-signs-get-document-error', error, 'error');
      return this.responseError(res, error);
    }

    // Send letter about signs cancellation.
    const isCancelSignsLetter = true;
    const { task } = updatedDocument;
    const signerIds = task && task.signerUsers;
    try {
      await (global.businesses.document.sendLetterToSigners as any)(updatedDocument, task, signerIds, userId, isCancelSignsLetter);
    } catch {
      global.log.save('send-letter-to-signers-error');
    }

    // Add multiSignInfo.
    await global.businesses.document.addMultiSignInfo(updatedDocument.task, { userInfo, type: 'delete_sign' });

    this.responseData(res, { document: updatedDocument });
  }

  /**
   * Check and save data from external reader.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async checkAndSaveDataFromExternalReader(req, res) {
    const documentId = req.params.id;
    const oauthToken = this.getRequestUserAccessToken(req);
    const user = this.getRequestUserInfo(req);
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const { path, index, service, method, captchaPayload } = req.body;
    const enabledMocksHeader = req.get('enabled-mocks');

    // Check draft expired.
    try {
      if (await global.models.task.checkDraftExpirationByDocumentId(documentId)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    let updatedDocument;
    try {
      updatedDocument = await (global.businesses.document.checkAndSaveDataFromExternalReader as any)({
        oauthToken,
        service,
        method,
        captchaPayload,
        documentId,
        path,
        index,
        user,
        userId,
        userUnitIds: userUnitIds,
        enabledMocksHeader,
      });
    } catch (error) {
      global.log.save('check-and-save-data-from-external-reader', { error: error && error.message, cause: error.cause }, 'error');
      return this.responseError(res, error);
    }

    this.responseData(res, updatedDocument);
  }

  /**
   * Check and save data from external reader async.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async checkAndSaveDataFromExternalReaderAsync(req, res) {
    const documentId = req.params.id;
    const oauthToken = this.getRequestUserAccessToken(req);
    const user = this.getRequestUserInfo(req);
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const { path, index, service, method, captchaPayload } = req.body;
    let { requestId } = req.body;
    const enabledMocksHeader = req.get('enabled-mocks');

    if (!global.redisClient) {
      global.log.save('external-reader-redis-error', { error: 'Redis client is not initialized' }, 'error');
      return this.responseError(res, 'Redis client is not initialized', 500);
    }

    if (requestId) {
      global.log.save('external-reader-request-id', { requestId }, 'info');
      let requestData = await global.redisClient.get(`external-reader-request-id:${requestId}`);

      if (!requestData) {
        return this.responseError(res, 'Request not found', 404);
      }

      requestData = JSON.parse(requestData);

      if (requestData.error) {
        return this.responseError(res, requestData.error, requestData.errorCode || 500);
      }

      if (requestData.status === 'done' && requestData.documentId) {
        const updatedDocument = await global.businesses.document.findByIdAndCheckAccess(requestData.documentId, userId, userUnitIds, true);
        return this.responseData(res, updatedDocument);
      }

      return this.responseData(res, requestData);
    }

    requestId = randomUUID();

    await global.redisClient.set(
      `external-reader-request-id:${requestId}`,
      {
        status: 'processing',
      },
      60 * 60,
    );

    // Check draft expired.

    let taskToCheck;
    try {
      taskToCheck = await global.models.task.findByDocumentId(documentId);
      if (global.businesses.task.checkDraftExpired(taskToCheck)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    (async () => {
      try {
        await (global.businesses.document.checkAndSaveDataFromExternalReader as any)({
          oauthToken,
          service,
          method,
          captchaPayload,
          documentId,
          path,
          index,
          user,
          userId,
          userUnitIds: userUnitIds,
          enabledMocksHeader,
        });

        await global.redisClient.set(
          `external-reader-request-id:${requestId}`,
          {
            status: 'done',
            documentId,
          },
          60 * 60,
        );
      } catch (error) {
        global.log.save('check-and-save-data-from-external-reader', { error: error && error.message, cause: error.cause }, 'error');

        let code = 500;
        if (error.message.includes('Authentication error')) {
          code = 401;
        }

        await global.redisClient.set(
          `external-reader-request-id:${requestId}`,
          {
            errorCode: code,
            error: error.message,
          },
          60 * 60,
        );

        global.models.workflowError.create({
          error: error.message,
          details: error.details || error.cause || error.stack,
          code,
          queueMessage: null,
          traceMeta: {
            workflowId: taskToCheck?.workflowId,
            taskId: taskToCheck?.id,
            taskTemplateId: taskToCheck?.taskTemplateId,
          },
          logId: requestId,
        });
      }
    })();

    this.responseData(res, { requestId });
  }

  /**
   * Update verified user info.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateVerifiedUserInfo(req, res) {
    const documentId = req.params.id;
    const userId = this.getRequestUserId(req);
    const oauthToken = this.getRequestUserAccessToken(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const userInfo = this.getRequestUserInfo(req);
    const enabledMocksHeader = req.get('enabled-mocks');

    let updatedDocument;
    try {
      updatedDocument = await (global.businesses.document.updateVerifiedUserInfo as any)(documentId, {
        userId,
        oauthToken,
        userUnitIds,
        userInfo,
        enabledMocksHeader,
      });
    } catch (error) {
      global.log.save('update-verified-user-info', { error: error && error.message, cause: error.cause }, 'error');
      return this.responseError(res, error);
    }

    this.responseData(res, updatedDocument);
  }

  /**
   * Check single sign
   * @param {object} req
   * @param {object} res
   */
  async singlesignCheck(req, res) {
    // Define params.
    const documentId = req.params.id;
    const userInfo = this.getRequestUserInfo(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const oauthToken = this.getRequestUserAccessToken(req);

    // Get document.
    try {
      const [document] = await this.documentModel.getByIds(documentId);
      if (!document) {
        return this.responseError(res, new NotFoundError(ERROR_DOCUMENT_NOT_FOUND));
      }

      const {
        jsonSchema: { singlesignCheck },
      } = await this.documentTemplateModel.findById(document.documentTemplateId);

      if (!singlesignCheck) {
        return this.responseData(res, { check: true, message: 'singlesignCheck is not defined' });
      }

      const { context: checkContext = [], errors: checkErrors = [], isEnabled } = singlesignCheck;

      if (
        isEnabled &&
        typeof isEnabled === 'string' &&
        !this.sandbox.evalWithArgs(isEnabled, [document.data, userInfo], {
          meta: { fn: 'singlesignCheck.isEnabled', documentId, isEnabled },
        })
      ) {
        return this.responseData(res, {
          check: true,
          message: 'disabled by isEnabled parameter',
        });
      }

      const context = await checkContext.reduce(async (accPromise, { name, provider, options }) => {
        const acc = await accPromise;
        const [providerType, service, method] = provider.split('.');

        let providerData;
        switch (providerType) {
          case 'external-reader': {
            const nonUserFilter = this.sandbox.evalWithArgs(options, [document.data], {
              meta: { fn: 'singlesignCheck.nonUserFilter', documentId, name },
            });
            const dataByUser = await this.externalReader.getDataByUser(
              service,
              method,
              undefined,
              oauthToken,
              userInfo,
              nonUserFilter,
              undefined,
              userUnitIds,
            );
            providerData = dataByUser.data;
          }
        }

        return { ...acc, [name]: providerData };
      }, Promise.resolve({ user: userInfo }));

      const errors = checkErrors.filter(({ check }) =>
        this.sandbox.evalWithArgs(check, [document.data, context], { meta: { fn: 'singlesignCheck.check', documentId, check } }),
      );
      if (!errors.length) {
        return this.responseData(res, { check: true });
      }

      const [firstError] = errors;
      return this.responseError(res, 'Singlesign check failed', undefined, [firstError.title, firstError.text].filter(Boolean).join(': '));
    } catch (error) {
      return this.responseError(res, 'Singlesign check error', undefined, error.message);
    }
  }
}


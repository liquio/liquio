/** @var {ExternalServicesBusiness} businesses.externalServices */
/** @var {UserInboxBusiness} businesses.userInbox */
/** @var {TaskModel} models.task */
/** @var {MessageQueue} global.messageQueue */

const xml2js = require('xml2js');
const Controller = require('./controller');
const DocumentModel = require('../models/document');
const DocumentAttachmentModel = require('../models/document_attachment');
const DocumentTemplateModel = require('../models/document_template');
const DocumentSignatureRejectionModel = require('../models/document_signature_rejection');
const WorkflowModel = require('../models/workflow');
const StorageService = require('../services/storage');
const FileGeneratorService = require('../services/file_generator');
const { UnauthorizedError } = require('../lib/errors');
const typeOf = require('../lib/type_of');

// Constants.
const CANT_FIND_TASK_AND_DOCUMENT_ERROR = 'Can\'t find task and document.';
const CANT_FIND_TASK_OR_DOCUMENT_ENTITIES_ERROR = 'Can\'t find task or document entities.';

/**
 * External service controller.
 */
class ExternalServicesController extends Controller {
  /**
   * External service controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!ExternalServicesController.singleton) {
      super(config);
      this.documentModel = new DocumentModel();
      this.documentAttachmentModel = new DocumentAttachmentModel();
      this.documentTemplateModel = new DocumentTemplateModel();
      this.documentSignatureRejectionModel = new DocumentSignatureRejectionModel();
      this.workflowModel = new WorkflowModel();
      this.storageService = new StorageService();
      this.fileGeneratorService = new FileGeneratorService();

      ExternalServicesController.singleton = this;
    }
    return ExternalServicesController.singleton;
  }

  async updateDocumentAndCommitSoap(req, res) {
    const envelopeKey = Object.keys(req.body).find((key) => key.endsWith(':Envelope'));
    if (!envelopeKey) {
      log.save('update-document-and-commit-soap-missing-envelope', { request: req.body }, 'error');
      return this.responseError(res, 'Missing SOAP envelope.', 400);
    }
    const envelope = req.body[envelopeKey];
    const soapNs = envelopeKey.split(':')[0];

    // Find xRoad namespace from the SOAP envelope
    let xRoadNs;
    try {
      xRoadNs = Object.keys(envelope['$'])
        .find((key) => req.body[`${soapNs}:Envelope`]['$'][key] === 'http://x-road.eu/xsd/xroad.xsd')
        .split(':')[1];
    } catch (error) {
      log.save('update-document-and-commit-soap-missing-xroad-namespace', { error: error.toString() }, 'error');
      return this.responseError(res, 'Missing xRoad namespace.', 400);
    }

    let token;
    try {
      // Extract token either from headers or from the body
      token = req.headers.authorization || envelope[`${soapNs}:Header`][0][`${xRoadNs}:userId`][0];

      // Unpack token value if its inside an XML object
      if (typeof token === 'object' && token._) {
        token = token._;
      }
    } catch (error) {
      log.save('update-document-and-commit-soap-invalid-token', { error: error.toString() }, 'error');
      return this.responseError(res, 'Missing or invalid authorization token.', 401);
    }

    if (!token) {
      log.save('update-document-and-commit-soap-missing-token', { request: req.body }, 'error');
      return this.responseError(res, 'Missing authorization token.', 401);
    }

    // Check if the token is present in basic auth config
    let externalServiceUser;
    const isAllTokenAllowed = !!global.config.basic_auth.tokens.find((item) => item === token || item === `Basic ${token}`);
    if (!isAllTokenAllowed) {
      log.save('update-document-and-commit-soap-unknown-user', { token }, 'error');
      return this.responseError(res, 'Unknown user.', 401);
    } else {
      try {
        externalServiceUser = Buffer.from(token.replace('Basic ', ''), 'base64').toString('utf-8').split(':')[0];
      } catch {
        log.save('update-document-and-commit-soap-invalid-token', { token }, 'error');
        return this.responseError(res, 'Invalid token.', 401);
      }
    }

    const { allowedToUpdateDocumentAndCommit: allowedMethodTokens, tasksTemplateIds: allowedTaskTemplateIds } = global.config.system_task;

    // Do not proceed if there is no access configuration
    if (!allowedMethodTokens) {
      log.save('update-document-and-commit-soap-no-allowed-method-tokens', {}, 'error');
      return this.responseError(res, 'Method not allowed.', 401);
    }

    // Check if the token is allowed to call this method
    const isTokenAllowed = !!allowedMethodTokens.find((item) => item === token || item === `Basic ${token}`);
    if (!isTokenAllowed) {
      log.save('update-document-and-commit-soap-unauthorized-user', {}, 'error');
      return this.responseError(res, new UnauthorizedError('Unauthorized user.'));
    }

    // Extract the document payload from the SOAP envelope
    let parsedRequest;
    try {
      parsedRequest = envelope[`${soapNs}:Body`][0]['ext:UpdateDocumentAndCommitIn'][0];
    } catch (error) {
      log.save('update-document-and-commit-soap-missing-request', { error: error.toString() }, 'error');
      return this.responseError(res, 'Missing request body.', 400);
    }

    const workflowId = parsedRequest['ext:workflowId'] && parsedRequest['ext:workflowId'][0];
    if (!workflowId) {
      log.save('update-document-and-commit-soap-missing-workflow-id', { parsedRequest });
      // return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. ext:workflowId required.'), false, 400);
    }

    const taskTemplateId = parsedRequest['ext:taskTemplateId'] && parseInt(parsedRequest['ext:taskTemplateId'][0]);
    if (isNaN(taskTemplateId)) {
      log.save('update-document-and-commit-soap-invalid-task-template-id', { parsedRequest });
      return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. ext:taskTemplateId should be number.'), false, 400);
    } else if (!allowedTaskTemplateIds.includes(taskTemplateId.toString())) {
      log.save('update-document-and-commit-soap-unauthorized-task-template-id', { parsedRequest });
      return this.responseXml(res, this.formSOAPErrorMessage('User is not allowed to operate on this task template'), false, 401);
    }

    // Decode base64 if needed.
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*?(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (parsedRequest['ext:documentDataObject'][0].match(base64Regex)) {
      log.save('update-document-and-commit-soap-decode-base64');
      try {
        const decodedBase64 = Buffer.from(parsedRequest['ext:documentDataObject'][0], 'base64').toString('utf-8');
        parsedRequest['ext:documentDataObject'][0] = decodedBase64;
      } catch {
        // Do nothing.
      }
    }

    const documentDataObject = parsedRequest['ext:documentDataObject'] && JSON.parse(parsedRequest['ext:documentDataObject'][0]);
    if (!documentDataObject) {
      log.save('update-document-and-commit-soap-invalid-document-data-object', { parsedRequest });
      return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. ext:documentDataObject should be JSON data.'), false, 400);
    }

    let files;
    try {
      files = parsedRequest['ext:file']?.map((item) => Buffer.from(item, 'base64'));
    } catch {
      log.save('update-document-and-commit-soap-invalid-file', { parsedRequest });
      return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. ext:file should be base64 encoded.'), false, 400);
    }

    let additionalDataSignatures;
    try {
      additionalDataSignatures = parsedRequest['ext:additionalDataSignature']?.map((item) => Buffer.from(item, 'base64'));
    } catch {
      log.save('update-document-and-commit-soap-invalid-additional-data-signature', { parsedRequest });
      return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. ext:additionalDataSignature should be base64 encoded.'), false, 400);
    }

    const signature = parsedRequest['ext:signature'] && parsedRequest['ext:signature'][0];
    const certificatePem = parsedRequest['ext:certificate'] && parsedRequest['ext:certificate'][0];

    let attachmentsSignatures = [];
    try {
      attachmentsSignatures = parsedRequest['ext:attachmentsSignature']?.map((item) => Buffer.from(item, 'base64'));
    } catch {
      log.save('update-document-and-commit-soap-invalid-attachments-signature', { parsedRequest });
      return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. ext:attachmentsSignature should be base64 encoded.'), false, 400);
    }

    const onError = (error, statusCode, _details) => {
      return this.responseXml(res, this.formSOAPErrorMessage(error), false, statusCode);
    };

    const onSuccess = (taskData) => {
      const { id, workflowId, documentId, finished, finishedAt } = taskData;
      const responseSoapJson = {
        'soapenv:Envelope': {
          $: {
            'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
            'xmlns:ext': 'ext',
          },
          'soapenv:Header': null,
          'soapenv:Body': {
            'ext:UpdateDocumentAndCommitOut': {
              'ext:task': { id, workflowId, documentId, finished, finishedAt },
            },
          },
        },
      };
      return this.responseXml(res, responseSoapJson);
    };

    return this._updateDocumentAndCommit(
      {
        workflowId,
        taskTemplateId,
        documentDataObject,
        files,
        additionalDataSignatures,
        signature,
        attachmentsSignatures,
        certificatePem,
        externalServiceUser,
      },
      onSuccess,
      onError,
    );
  }

  async updateDocumentAndCommitRest(req, res) {
    const onError = (error, statusCode, details) => {
      return this.responseError(res, error, statusCode, details);
    };

    const onSuccess = (data) => {
      return this.responseData(res, this.filterResponse(data));
    };

    return this._updateDocumentAndCommit(
      {
        workflowId: req.params.workflow_id,
        taskTemplateId: parseInt(req.params.task_template_id),
        documentDataObject: req.body.document,
        files: req.body.files,
        additionalDataSignatures: req.body.additionalDataSignatures,
        signature: req.body.signature,
        attachmentsSignatures: req.body.attachmentsSignatures || [],
        certificatePem: req.body.certificate,
        externalServiceUser: this.getRequestExternalUser(req),
      },
      onSuccess,
      onError,
    );
  }

  /**
   * Update document and commit.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async _updateDocumentAndCommit(params, onSuccess, onError) {
    let { workflowId } = params;

    const {
      taskTemplateId,
      documentDataObject,
      files,
      additionalDataSignatures,
      signature,
      attachmentsSignatures,
      certificatePem,
      externalServiceUser,
    } = params;

    log.save('update-document-and-commit', { workflowId, taskTemplateId });

    // Define task and document entities.
    let taskAndDocumentEntities;
    try {
      if (!workflowId && taskTemplateId) {
        const workflowTemplateId = String(taskTemplateId).slice(0, -3);
        const createdTask = await businesses.task.create({
          workflowTemplateId,
          taskTemplateId,
          userId: externalServiceUser,
        });

        workflowId = createdTask.workflowId;
      }

      taskAndDocumentEntities = await models.task.findDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId);
    } catch (error) {
      log.save('find-task-and-document-error', { workflowId, taskTemplateId, error: error && error.message }, 'error');
      return onError(CANT_FIND_TASK_AND_DOCUMENT_ERROR);
    }
    if (!taskAndDocumentEntities) {
      log.save('find-task-or-document-not-found', { workflowId, taskTemplateId }, 'error');
      return onError(CANT_FIND_TASK_OR_DOCUMENT_ENTITIES_ERROR);
    }
    const { task, document } = taskAndDocumentEntities;
    const { id: taskId } = task;
    const { id: documentId } = document;

    // Update document.
    try {
      await businesses.document.updateByExternalService(documentId, documentDataObject, externalServiceUser);
    } catch (error) {
      log.save('update-document-error', { error: error && error.message }, 'error');
      return onError(error);
    }

    // Save files as document attachments (without signatures, just attachments).
    if (typeOf(files) === 'array' && files.length > 0) {
      try {
        await businesses.document.createAttachmentsForSystemTask(files, documentId, externalServiceUser);
      } catch (error) {
        log.save('save-attachments-error', { error: error && error.message }, 'error');
        return onError(error, error.httpStatusCode, error.details);
      }
    }

    // Save additional data signatures.
    if (typeOf(additionalDataSignatures) === 'array' && additionalDataSignatures.length > 0) {
      try {
        await businesses.document.saveAdditionalDataSignatures(additionalDataSignatures, document, externalServiceUser);
      } catch (error) {
        log.save('save-additional-data-signatures-error', { error: error && error.message }, 'error');
        return onError(error, error.httpStatusCode, error.details);
      }
    }

    // Add signature.
    if (signature || certificatePem) {
      const signatureBuffer = Buffer.from(signature || '', 'utf8');
      const certificatePemBuffer = Buffer.from(certificatePem || '', 'utf8');
      const isSigned = await models.documentSignature.create({
        documentId,
        createdBy: externalServiceUser,
        signature: signatureBuffer,
        certificate: certificatePemBuffer,
      });
      if (!isSigned) {
        log.save('document-signature-error', {}, 'error');
        return onError('Document signature error.', 400);
      }
    }

    // Save files as document attachments (with signatures).
    if (typeOf(attachmentsSignatures) === 'array' && attachmentsSignatures.length > 0) {
      try {
        const savedAttachments = await businesses.document.saveAttachmentsP7SSignatures(attachmentsSignatures, document, externalServiceUser);
        // Save attachment info to document.
        for (const [index, attachment] of savedAttachments.entries()) {
          // Remove signatureInfo from attachment to avoid circular reference
          delete attachment.signatureInfo;
          // We need to get the updated document for correct saving attachment array.
          const documentToUpdate = await models.document.findById(documentId);
          await businesses.document.saveAttachmentToDocumentData(
            attachment,
            `initData.attachmentsSignatures.${index}`,
            documentToUpdate,
            externalServiceUser,
            undefined,
            true,
          );
        }

        for (const attachment of savedAttachments) {
          if (attachment.signatureInfo) {
            await models.documentSignature.create(attachment.signatureInfo);
          }
        }
      } catch (error) {
        log.save('save-attachments-signatures-error', { error: error && error.message }, 'error');
        return onError(error, error.httpStatusCode, error.details);
      }
    }

    // Commit.
    let finishedTask;
    try {
      finishedTask = await businesses.task.setStatusFinished(taskId, externalServiceUser);

      // Send message to RabbitMQ.
      const message = { workflowId: finishedTask.workflowId, taskId: taskId };
      global.messageQueue.produce(message);
    } catch (error) {
      log.save('commit-task-error', { error: error && error.message }, 'error');
      return onError(error, error.httpStatusCode, error.details);
    }

    log.save('update-document-and-commit-success', { workflowId, taskId, documentId });
    await onSuccess(finishedTask);

    // Send document to inboxes if need it.
    businesses.userInbox.sendToInboxesIfNeedIt(finishedTask);
  }

  async rpzmSoap(req, res) {
    if (!req.body?.['soapenv:Envelope']?.['soapenv:Body']?.[0]) {
      return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. Envelope.Body required.'), false, 400);
    }

    let header;
    let serviceCode;
    try {
      header = req.body['soapenv:Envelope']['soapenv:Header'][0];
      serviceCode = header['xroad:service'][0]['xroad:serviceCode'][0];
      const client = header['xroad:client'][0];
      const clientCredentials = [
        client['xroad:xRoadInstance'],
        client['xroad:memberClass'],
        client['xroad:memberCode'],
        client['xroad:subsystemCode'],
      ].join(':');
      if (!this.config.external_services.rpzm.clients.includes(clientCredentials)) {
        return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. Unknown client.'), false, 403);
      }
    } catch {
      return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. Envelope.Header.xroad:client required.'), false, 400);
    }

    switch (serviceCode) {
      case 'UpdateApplicationStatusInfo':
        return this._rpzmUpdateApplicationStatus(req, res);
      default:
        return this.responseXml(res, this.formSOAPErrorMessage('Invalid request. Unknown operation.'), false, 400);
    }
  }

  async _rpzmUpdateApplicationStatus(req, res) {
    const onError = (error, statusCode, _details) => {
      const responseSoapJson = {
        'soapenv:Envelope': {
          $: { 'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/' },
          'soapenv:Header': null,
          'soapenv:Body': {
            'ext:UpdateApplicationStatusInfoOut': {
              success: false,
              message: error,
            },
          },
        },
      };
      return this.responseXml(res, responseSoapJson, false, statusCode);
    };

    const onSuccess = (_data) => {
      const responseSoapJson = {
        'soapenv:Envelope': {
          $: { 'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/' },
          'soapenv:Header': null,
          'soapenv:Body': {
            'ext:UpdateApplicationStatusInfoOut': {
              'ext:success': true,
            },
          },
        },
      };
      return this.responseXml(res, responseSoapJson);
    };

    const eventTemplateId = this.config.external_services.rpzm.eventTemplateId;
    if (!eventTemplateId) {
      return onError('Invalid configuration. eventTemplateId required.', 500);
    }

    const taskTemplateId = this.config.external_services.rpzm.taskTemplateId;
    if (!taskTemplateId) {
      return onError('Invalid configuration. taskTemplateId required.', 500);
    }

    const parsedRequest = req.body['soapenv:Envelope']['soapenv:Body'][0]['ext:UpdateApplicationStatusInfoIn'][0];

    const sourceCode = parsedRequest['ext:sourceCode'] && parsedRequest['ext:sourceCode'][0];
    if (!sourceCode) {
      return onError('Invalid request. ext:sourceCode required.', 400);
    }
    const applicationNumber = parsedRequest['ext:applicationNumber'] && parsedRequest['ext:applicationNumber'][0];
    if (!applicationNumber) {
      return onError('Invalid request. ext:applicationNumber required.', 400);
    }
    const applicationStatusCode = parsedRequest['ext:applicationStatusCode'] && parsedRequest['ext:applicationStatusCode'][0];
    if (!applicationStatusCode) {
      return onError('Invalid request. ext:applicationStatusCode required.', 400);
    }
    const changeDate = parsedRequest['ext:changeDate'] && parsedRequest['ext:changeDate'][0];
    if (!changeDate) {
      return onError('Invalid request. ext:changeDate required.', 400);
    }
    const reason = parsedRequest['ext:reason'] && parsedRequest['ext:reason'][0];

    log.save('external-services|rpzm|update-application-status-info', { sourceCode, applicationNumber, applicationStatusCode, changeDate, reason });

    const [event] = await this.workflowModel.db.query(
      `
      SELECT
      workflow_id AS "workflowId"
      FROM events e WHERE event_template_id = '${eventTemplateId}'
      AND data#>>'{result,sendToExternalService,sendingResult,applicationNumber}' = '${applicationNumber}'
      AND data#>>'{result,sendToExternalService,sendingResult,applicationId}' IS NOT NULL`,
      { type: global.db.QueryTypes.SELECT },
    );

    if (!event || !event.workflowId) {
      return onError('Cannot find workflow ID by applicationNumber.', 400);
    }

    const workflowId = event.workflowId;

    const documentDataObject = {
      result: {
        sourceCode,
        applicationNumber,
        applicationStatusCode,
        changeDate,
        reason,
      },
    };

    return this._updateDocumentAndCommit(
      {
        workflowId,
        taskTemplateId,
        documentDataObject,
        externalServiceUser: this.getRequestExternalUser(req),
      },
      onSuccess,
      onError,
    );
  }

  /**
   * Add attachment.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async addAttachment(req, res) {
    // Define params.
    const documentId = req.params.id;
    const originalFileName = req.query.file_name;
    const labels = (Array.isArray(req.query.labels) ? req.query.labels : [req.query.labels || '']).filter((v) => !!v);
    const contentType = req.query.content_type || req.headers['content-type'];
    const contentLength = req.query.content_length || req.headers['content-length'];
    const externalServiceUser = this.getRequestExternalUser(req);

    // Check access to document.
    try {
      await businesses.document.findByIdAndCheckAccess(documentId, externalServiceUser, [], true);
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
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, attachment);
  }

  /**
   * Update document.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateDocument(req, res) {
    // Define params.
    const { workflow_id: workflowId, task_template_id } = req.params;
    const taskTemplateId = parseInt(task_template_id);
    const { document: documentDataObject, signature, certificate: certificatePem } = req.body;
    const externalServiceUser = this.getRequestExternalUser(req);

    // Define task and document entities.
    let taskAndDocumentEntities;
    try {
      taskAndDocumentEntities = await models.task.findDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!taskAndDocumentEntities) {
      return this.responseError(res, 'Can\'t find task or document entities.');
    }
    const { document } = taskAndDocumentEntities;
    const { id: documentId } = document;

    // Update document.
    let updatedDocument;
    try {
      updatedDocument = await businesses.document.updateByExternalService(documentId, documentDataObject, externalServiceUser);
    } catch (error) {
      return this.responseError(res, error);
    }

    if (signature) {
      // Add signature.
      const signatureBuffer = Buffer.from(signature, 'utf8');
      const certificatePemBuffer = Buffer.from(certificatePem, 'utf8');
      const isSigned = await models.documentSignature.create({
        documentId,
        createdBy: externalServiceUser,
        signature: signatureBuffer,
        certificate: certificatePemBuffer,
      });
      if (!isSigned) {
        throw new Error('Document signature error.');
      }
    }

    // Response.
    this.responseData(res, this.filterResponse(updatedDocument));
  }

  /**
   * Commit document.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async commitDocument(req, res) {
    // Define params.
    const { workflow_id: workflowId, task_template_id } = req.params;
    const taskTemplateId = parseInt(task_template_id);
    const externalServiceUser = this.getRequestExternalUser(req);

    // Define task and document entities.
    let taskAndDocumentEntities;
    try {
      taskAndDocumentEntities = await models.task.findDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!taskAndDocumentEntities) {
      return this.responseError(res, 'Can\'t find task or document entities.');
    }
    const { task } = taskAndDocumentEntities;
    const { id: taskId } = task;

    // Commit.
    let finishedTask;
    try {
      finishedTask = await businesses.task.setStatusFinished(taskId, externalServiceUser);

      // Send message to RabbitMQ.
      const message = { taskId: taskId };
      global.messageQueue.produce(message);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    // Response.
    this.responseData(res, this.filterResponse(finishedTask));
  }

  /**
   * Create task.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createTask(req, res) {
    // Define params.
    const { workflowId, workflowTemplateId, taskTemplateId, parentDocumentId, copyFrom, originalDocument } = req.body;
    const externalServiceUser = this.getRequestExternalUser(req);

    // Create task.
    let createdTask;
    try {
      createdTask = await businesses.task.create({
        workflowId,
        workflowTemplateId: workflowTemplateId,
        taskTemplateId,
        parentDocumentId,
        userId: externalServiceUser,
        copyFrom,
        originalDocument,
      });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    // Response.
    this.responseData(res, this.filterResponse(createdTask));
  }

  /**
   * Calculate payment info.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async calculatePaymentData(req, res) {
    const { workflow_id: workflowId, task_template_id } = req.params;
    const taskTemplateId = parseInt(task_template_id);
    const externalServiceUser = this.getRequestExternalUser(req);
    const { paymentControlPath } = req.body;

    let documentWithPayment;
    try {
      documentWithPayment = await businesses.document.calculatePayment(
        undefined,
        paymentControlPath,
        externalServiceUser,
        [],
        undefined,
        workflowId,
        taskTemplateId,
      );
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, documentWithPayment);
  }

  /**
   * Get document.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getDocument(req, res) {
    const { workflow_id: workflowId, task_template_id } = req.params;
    const taskTemplateId = parseInt(task_template_id);
    const externalServiceUser = this.getRequestExternalUser(req);

    // Check access and get document.
    let document;
    try {
      document = await businesses.document.findByWorkflowIdAndCheckAccess(workflowId, taskTemplateId, externalServiceUser, [], true);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!document) {
      return this.responseError(res, 'Can not find document by workflowId and task template.');
    }

    this.responseData(res, document);
  }

  /**
   * @param {e.Request} req
   * @param {e.Response} res
   */
  async pingSOAP(req, res) {
    const soapJson = {
      'soap:Envelope': {
        $: { 'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/' },
        'soap:Header': null,
        'soap:Body': {
          processPid: process.pid,
          message: 'pong',
        },
      },
    };
    const response = new xml2js.Builder().buildObject(soapJson);
    return this.responseXml(res, response, false);
  }

  /**
   * @param {e.Request} req
   * @param {e.Response} res
   */
  async pingREST(req, res) {
    const pong = {
      processPid: process.pid,
      message: 'pong',
    };
    return this.responseData(res, pong);
  }

  /**
   * @param {string} errorMessage
   * @return {string}
   */
  formSOAPErrorMessage(errorMessage) {
    const soapJson = {
      'soap:Envelope': {
        $: { 'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/' },
        'soap:Header': null,
        'soap:Body': {
          error: errorMessage,
        },
      },
    };
    return new xml2js.Builder().buildObject(soapJson);
  }
}

module.exports = ExternalServicesController;

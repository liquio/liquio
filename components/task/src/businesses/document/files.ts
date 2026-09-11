import { PassThrough, Readable } from 'node:stream';

import _ from 'lodash';
import nodeHtmlParser from 'node-html-parser';

import { ERROR_DOCUMENT_NOT_FOUND, ERROR_DOCUMENT_TEMPLATE_NOT_FOUND, ERROR_WORKFLOW_NOT_FOUND } from '../../constants/error';
import { DocumentAttachmentEntity } from '../../entities/document_attachment';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { Business } from '../business';
import type { DocumentBusiness } from './index';
import type { UserUnitIds } from './types';

// Constants.
const DOCUMENT_PREVIEW_SCHEMA_CONTROL = 'preview.document';
const DIRECT_DOCUMENT_PREVIEW_SCHEMA_CONTROL = 'preview.document.direct';
const EVENT_FILE_DOCUMENT_TEMPLATE_ID = 999999999;
const APLICATION_PDF = 'application/pdf';
const NAME_TAG_REGEX = /<meta name=['|"]{1}description['|"]{1} content=['|"]{1}([waА-Яа-яёЁЇїІіЄєҐґ \-()[\]{}]{1,200})['|"]{1}[ />|>| >]/gim;
const ERROR_ATTACHMENT_FILE_NOT_FOUND = 'Attachment file link not found.';
const ERROR_DOCUMENT_ACCESS = "User doesn't have any access to document.";

/**
 * Document file business - attachments, file previews, and PDF generation.
 * Extracted from the former monolithic `DocumentBusiness` (see `document/index.ts`).
 */
export class DocumentFileBusiness extends Business {
  constructor(
    config: any,
    private host: DocumentBusiness,
  ) {
    super(config);
  }

  /**
   * Get attachment info.
   * @param attachmentId Attachment ID.
   */
  async getAttachmentInfo(attachmentId: string): Promise<DocumentAttachmentEntity> {
    // Return attachment info.
    const attachmentInfo = await global.models.documentAttachment.findById(attachmentId);
    if (!attachmentInfo) {
      throw new NotFoundError('Attachment not found.');
    }
    return attachmentInfo;
  }

  /**
   * Get attachment file link.
   * @param documentId Document ID.
   * @param attachmentId Attachment ID.
   * @param withName With name.
   */
  async getAttachmentFileLink(documentId: string, attachmentId: string, withName = false): Promise<{ fileLink: string; fileName: string } | string> {
    // Get attachment info.
    const attachmentInfo = await this.getAttachmentInfo(attachmentId);

    // Get and return file link.
    const fileLink = attachmentInfo.link;
    const fileName = attachmentInfo.name;
    if (!fileLink) {
      throw new Error(ERROR_ATTACHMENT_FILE_NOT_FOUND);
    } else if (attachmentInfo.documentId !== documentId) {
      throw new ForbiddenError(ERROR_DOCUMENT_ACCESS);
    }
    return withName ? { fileLink, fileName } : fileLink;
  }

  /**
   * Get attachment files links.
   * @param documentId Document ID.
   */
  async getAttachmentFilesLinks(documentId: string): Promise<string[]> {
    // Get document attachments.
    const attachments = await global.models.documentAttachment.getByDocumentId(documentId);
    if (!attachments) {
      throw new ForbiddenError(ERROR_DOCUMENT_ACCESS);
    }

    // Define and return attachments links.
    const attachmentsLinks = attachments.map((v) => v.link);
    return attachmentsLinks;
  }

  /**
   * Get attachment.
   * @param documentId Document ID.
   * @param attachmentId Attachment ID.
   * @param userId User ID.
   * @returns Download file readable stream.
   */
  async getAttachment(documentId: string, attachmentId: string, userId: string): Promise<any> {
    // Get file link.
    // Pre-existing bug (not introduced/fixed by this typing pass, flagged for follow-up): `userId`
    // is passed positionally where `getAttachmentFileLink`'s 3rd param is `withName: boolean`, so
    // this always requests the `{ fileLink, fileName }` object form (truthy string) instead of the
    // plain string this code then treats `fileLink` as.
    const fileLink = await this.getAttachmentFileLink(documentId, attachmentId, userId as any);
    if (!fileLink) {
      throw new Error(ERROR_ATTACHMENT_FILE_NOT_FOUND);
    }

    // Get and return readable stream from file storage.
    const downloadFileReadableStream = await this.host.storageService.provider.downloadFile(fileLink);
    return downloadFileReadableStream;
  }

  /**
   * Delete attachment.
   * @param documentId Document ID.
   * @param attachmentId Attachment ID.
   * @param userId User ID.
   * @returns File link. Documented as a plain string, but see the pre-existing-bug note in
   * `getAttachment` above - the real return value can end up being the `{ fileLink, fileName }`
   * object form. Harmless today: both existing callers ignore this method's return value.
   */
  async deleteAttachment(documentId: string, attachmentId: string, userId: string): Promise<string | { fileLink: string; fileName: string }> {
    // Get file link.
    const fileLink = await this.getAttachmentFileLink(documentId, attachmentId, userId as any);

    // Delete attachment from DB.
    const deleted = await global.models.documentAttachment.delete(attachmentId);
    if (!deleted) {
      throw new Error("Can't delete attachment.");
    }

    // Return file link.
    return fileLink;
  }

  /**
   * Get files to preview.
   * @param workflowId Workflow ID.
   * @param documentTemplateId Document template ID.
   * @param path Path. Samples: `userDocument`, `userDocument.filesFromPreviousDocument`.
   * @param task Task.
   * @param isDirect Is direct files indicator.
   * @param isNotOnlyCurrent Only current tasks indicator.
   * @returns Promise of files info list - each item's shape depends on the document template's
   * JSON schema (`documentTemplateAccess`, etc.), so it's left as `any[]` rather than modeled precisely.
   */
  async getFilesToPreview(
    workflowId: string,
    documentTemplateId: number,
    path: string,
    task?: any,
    isDirect = false,
    isNotOnlyCurrent = false,
  ): Promise<any[]> {
    // Define step schema.
    const documentTemplate = await global.models.documentTemplate.findById(documentTemplateId);
    const { jsonSchema } = documentTemplate || {};
    const controlSchema = _.get((jsonSchema && jsonSchema.properties) || {}, path);

    // Check schema control.
    const { control: schemaControl, filter: filterFunction } = controlSchema || {};
    if (
      documentTemplateId &&
      ((isDirect && schemaControl !== DIRECT_DOCUMENT_PREVIEW_SCHEMA_CONTROL) || (!isDirect && schemaControl !== DOCUMENT_PREVIEW_SCHEMA_CONTROL))
    ) {
      throw new BadRequestError('Schema control not found.');
    }

    // Define needed document templates to show files preview. All files from current workflow should be shown if filter not defined.

    let {
      documentTemplateIds: filesDocumentTemplateIds = [],
      documentTemplateId: filesDocumentTemplateId,
      eventTemplateIds: filesEventTemplateIds = [],
    } = controlSchema || {};

    const documentTemplateIds = isDirect ? [filesDocumentTemplateId] : filesDocumentTemplateIds;

    // Define documents IDs from current workflow.
    let useFilterByTask = {};
    if (task && (task.finished === true || task.isCurrent === false)) {
      useFilterByTask = { onlyCurrent: false, maxCreatedAtTask: task.updatedAt };
    }

    // Define onlyCurrent task filter.
    if (isNotOnlyCurrent) {
      useFilterByTask = { onlyCurrent: false, isDistinct: true };
    }

    const taskIdsAndDocumentIds = await global.models.task.getTaskAndDocumentMainInfo(workflowId, useFilterByTask); // Format: `{ taskId, documentId, taskPerformerUsers, taskPerformerUnits, taskRequiredPerformerUnits, taskObserverUnits }[]`.
    let documentIds = taskIdsAndDocumentIds.map((v) => v.documentId).filter((v) => !!v);

    // Define all files info.
    const { includeMainFile = false, documentAttaches: documentAttachesFunctionString } = controlSchema || {};

    let directDocument;
    if (isDirect && documentAttachesFunctionString) {
      const { document } =
        (await (global.models.task.findDocumentByWorkflowIdAndTaskTemplateIds as any)(workflowId, [filesDocumentTemplateId])) || {};
      if (!document) {
        return [];
      }
      directDocument = document;
      directDocument.attachments = await global.models.documentAttachment.getByDocumentId(document.id);
    }

    const events = await global.models.event.getEventsByWorkflowId(workflowId);
    filesEventTemplateIds = [...new Set([...filesEventTemplateIds, ...events.map((v) => v.eventTemplateId)])];
    const eventsWithTemplates = [];
    if (Array.isArray(filesEventTemplateIds) && filesEventTemplateIds.length > 0) {
      const eventDocumentIds = events.filter((v) => v.documentId && filesEventTemplateIds.includes(v.eventTemplateId)).map((v) => v.documentId);

      documentIds = documentIds.concat(eventDocumentIds);
      documentTemplateIds.push(EVENT_FILE_DOCUMENT_TEMPLATE_ID);

      const eventsTemplates = await global.models.eventTemplate.findByIds(events.map((v) => v.eventTemplateId));
      for (const eventEntity of events) {
        const { eventTemplateId } = eventEntity;
        const eventTemplate = eventsTemplates.find((v) => v.id === eventTemplateId);
        eventsWithTemplates.push({ ...eventEntity, eventTemplate });
      }
    }

    if (documentTemplateId && documentTemplateIds.length === 0) {
      return [];
    }

    let documentAttachments;
    if (isDirect && documentAttachesFunctionString) {
      documentAttachments = this.host.sandbox.evalWithArgs(documentAttachesFunctionString, [directDocument], {
        meta: { fn: 'documentAttaches', workflowId },
      });
    } else {
      documentAttachments = await (global.models.documentAttachment.getByDocumentIds as any)(documentIds);
    }

    const documentInfoWithFileNames: any = await global.models.document.getFilesNamesByIds(documentIds);

    let mainFilesInfo = [];
    if (!isDirect || (isDirect && includeMainFile)) {
      mainFilesInfo = documentInfoWithFileNames.map((v) => ({
        documentId: v.documentId,
        documentTemplateId: v.documentTemplateId,
        eventTemplateId: (eventsWithTemplates.find((e) => e.documentId === v.documentId) || {}).eventTemplateId,
        fileLink: v.fileId,
        fileName: v.fileName,
        fileSize: v.fileSize,
        isGenerated: true,
        updatedAt: v.updatedAt,
        labels: [],
      }));
      if (isDirect && documentAttachesFunctionString) {
        mainFilesInfo = mainFilesInfo.filter((v) => documentTemplateIds.includes(v.documentTemplateId));
      }
    }

    const attachesInfo = documentAttachments.map((v) => ({
      documentId: v.documentId,
      documentTemplateId: (documentInfoWithFileNames.find((info) => info.documentId === v.documentId) || {}).documentTemplateId,
      fileLink: v.link,
      fileName: v.name,
      fileSize: v.size,
      isGenerated: v.isGenerated || false,
      createdAt: v.createdAt,
      labels: v.labels || [],
      meta: v.meta || {},
    }));

    let allFilesInfo = [...mainFilesInfo, ...attachesInfo].filter((v) => !!v.fileLink);

    const documentTemplates = await global.models.documentTemplate.getAccessJsonSchemasByIds(allFilesInfo.map((v) => v.documentTemplateId));

    allFilesInfo = allFilesInfo
      .map((v) => ({
        ...v,
        ...{
          documentTemplateAccess: (documentTemplates.find((info) => info.documentTemplateId === v.documentTemplateId) || {}).accessJsonSchema || {},
          eventTemplateAccess:
            (((eventsWithTemplates.find((info) => info.eventTemplateId === v.eventTemplateId) || {}).eventTemplate || {}).jsonSchema || {})
              .accessJsonSchema || {},
          taskPerformerUsers: (taskIdsAndDocumentIds.find((info) => info.documentId === v.documentId) || {}).taskPerformerUsers,
          taskPerformerUnits: (taskIdsAndDocumentIds.find((info) => info.documentId === v.documentId) || {}).taskPerformerUnits,
          taskRequiredPerformerUnits: (taskIdsAndDocumentIds.find((info) => info.documentId === v.documentId) || {}).taskRequiredPerformerUnits,
          taskObserverUnits: (taskIdsAndDocumentIds.find((info) => info.documentId === v.documentId) || {}).taskObserverUnits,
        },
      }))
      .sort((a, b) => +(a.documentId > b.documentId));

    if (documentTemplateId && !(isDirect && documentAttachesFunctionString)) {
      allFilesInfo = allFilesInfo.filter((v) => documentTemplateIds.includes(v.documentTemplateId));
    }

    // Handle all files info list.
    let documents;
    for (const fileInfo of allFilesInfo) {
      // Generate and append download token.
      const { fileLink, eventTemplateAccess = {} } = fileInfo;
      const { workflowFiles = {} } = eventTemplateAccess;
      const { fileName: fileNameFunc } = workflowFiles;
      if (fileNameFunc) {
        if (!documents) {
          documents = await global.models.document.getByIds(documentIds);
        }
        try {
          fileInfo.fileName = this.host.sandbox.evalWithArgs(fileNameFunc, [documents], { checkArrow: true, meta: { fn: 'fileName', workflowId } });
        } catch (error) {
          global.log.save('file-name-generating-error', { error: error.message, fileNameFunc, documentIds, workflowId });
        }
      }
      fileInfo.downloadToken = this.host.downloadToken.generate(fileLink);
    }

    if (typeof filterFunction === 'string') {
      try {
        const f = this.host.sandbox.eval(filterFunction);
        allFilesInfo = allFilesInfo.filter(f);
      } catch (error) {
        global.log.save('filter-error', { error });
      }
    }

    return allFilesInfo;
  }

  /**
   * Get files to preview.
   * @param documentId Document ID.
   * @param stepOrPath Step name or path. Sample: "userDocument.documentPreview".
   * @param userId User ID.
   * @param userUnitIds User unit IDs.
   * @param isDirect Is direct files indicator.
   */
  async getFilesToPreviewAndCheckAccess(
    documentId: string,
    stepOrPath: string,
    userId: string,
    userUnitIds: UserUnitIds,
    isDirect = false,
  ): Promise<any[]> {
    // Get document and check access.
    const document: any = await this.host.findByIdAndCheckAccess(documentId, userId, userUnitIds);

    // Define document template ID.
    const { documentTemplateId } = document;

    // Define workflow ID.
    const task = await global.models.task.findByDocumentId(documentId);
    const { workflowId } = task;

    // Get and return files to preview.
    const filesToPreview = await this.getFilesToPreview(workflowId, documentTemplateId, stepOrPath, task, isDirect);
    const documentIds = [...new Set(filesToPreview.map((v) => v.documentId).filter(Boolean))];

    const documentSignaturesPromises = documentIds.map((documentId) => (global.models.documentSignature.getByDocumentId as any)(documentId));
    const documentSignatures = await Promise.all(documentSignaturesPromises);
    const fileIds = filesToPreview.map((v) => v.fileLink);
    const p7sMetadata = await this.host.storageService.provider.getP7sMetadata(fileIds);

    const allSignaturesInfo = {};
    for (const documentId of documentIds) {
      try {
        const docSignatures = documentSignatures.filter((doc) => doc && doc[0] && doc[0].documentId === documentId);
        const docSignaturesArray = docSignatures.reduce((curr, acc) => acc.concat(curr), []);
        const signaturesParsedArray = docSignaturesArray.map(({ signature }) => signature && JSON.parse(signature));
        const signatures = signaturesParsedArray.reduce((acc, curr) => acc.concat(curr), []);
        const signaturesInfo = [];
        if (p7sMetadata.length > 0) {
          for (const signature of signatures) {
            try {
              const signatureInfo = await this.host.eds.getSignatureInfo(signature);
              signaturesInfo.push(signatureInfo);
            } catch (error) {
              global.log.save('get-files-to-preview-and-check-access|get-signature-info-error', error.message);
            }
          }
        } else {
          if (signatures.length > 0) {
            try {
              const signatureInfo = await this.host.eds.getSignatureInfo(signatures[0]);
              signaturesInfo.push(signatureInfo);
            } catch (error) {
              global.log.save('get-files-to-preview-and-check-access|get-signature-info-error', error.message);
            }
          }
        }
        allSignaturesInfo[documentId] = signaturesInfo.reduce(
          (acc, curr) => (acc.find(({ serial }) => serial === curr.serial) ? acc : acc.concat(curr)),
          [],
        );
      } catch (error) {
        global.log.save('error', error.message);
      }
    }

    // Add signature info.
    for (let i = 0; i < filesToPreview.length; i++) {
      try {
        const signaturesInfo = allSignaturesInfo[filesToPreview[i].documentId];
        filesToPreview[i].signature = { ...(signaturesInfo || [])[0], content: undefined };
        filesToPreview[i].signatures = (signaturesInfo || []).map((v) => ({ ...v, content: undefined }));
        filesToPreview[i].hasP7sSignature = p7sMetadata.some((v) => v.file_id === filesToPreview[i].fileLink);
      } catch (error) {
        global.log.save('Can not get signature info', error);
      }
    }

    return filesToPreview;
  }

  /**
   * Create attachments for system task.
   * @param files Files list to save.
   * @param documentId Document ID.
   * @param userId User ID.
   * @param userUnitIds User unit IDs.
   * @param isKeepDocumentFile
   */
  async createAttachmentsForSystemTask(
    files: any[],
    documentId: string,
    userId: string,
    userUnitIds: UserUnitIds,
    isKeepDocumentFile = false,
  ): Promise<void> {
    const filesDataPromises = [];
    const attachmentsPromises = [];
    for (const fileIndex in files) {
      const file = files[fileIndex];
      const { name, contentType, fileContent } = file || {};
      const fileBuffer = Buffer.from(fileContent, 'base64');
      const contentLength = fileBuffer.length;
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);

      // Upload file.
      const uploadFilePromise = this.host.storageService.provider.uploadFileFromStream(readableStream, name, undefined, contentType, contentLength);
      filesDataPromises.push(uploadFilePromise);
    }

    const uploadFilesInfo = await Promise.allSettled(filesDataPromises);

    const rejectedFiles = uploadFilesInfo.map(({ status, reason }: any, index) => status === 'rejected' && { reason, index }).filter(Boolean);
    if (rejectedFiles.length) {
      global.log.save('create-attachments-for-system-task|upload-file-rejected', { rejectedFiles });
      throw new Error(rejectedFiles.map((item) => `File ${files[item.index].name} upload error: ${item.reason}`).join(', '));
    }

    // Create attachment.
    for (const fileInfoIndex in uploadFilesInfo) {
      // Add to DB.
      const { value: fileInfo }: any = uploadFilesInfo[fileInfoIndex];

      const attachment = this.host.documentAttachmentModel.create({
        documentId,
        name: fileInfo.name,
        type: fileInfo.contentType,
        size: fileInfo.contentLength,
        link: fileInfo.id,
        meta: files[fileInfoIndex].meta || {},
      });

      attachmentsPromises.push(attachment);
    }
    const attachmentList = await Promise.all(attachmentsPromises);

    // Save attachment info to document.
    for (const [index, attachment] of attachmentList.entries()) {
      // We need to get the updated document for correct saving attachment array.
      const updatedDocument = await global.models.document.findById(documentId);
      await global.businesses.document.files.saveAttachmentToDocumentData(
        attachment,
        `initData.files.${index}`,
        updatedDocument,
        userId,
        userUnitIds,
        true,
        isKeepDocumentFile,
      );
    }
  }

  /**
   * Save attachment to document data.
   * @param attachment Attachment.
   * @param documentPath Document data path to save attachment info.
   * @param document Document.
   * @param userId User ID.
   * @param userUnitIds User unit IDs info.
   * @param isFromSystemTask
   * @param isKeepDocumentFile
   */
  async saveAttachmentToDocumentData(
    attachment: any,
    documentPath: string,
    document: any,
    userId: string,
    userUnitIds: UserUnitIds,
    isFromSystemTask = false,
    isKeepDocumentFile = false,
  ): Promise<void> {
    // Check if no needs to save.
    if (!documentPath) {
      return;
    }

    // Define params.
    const { id: documentId } = document;
    const isDocumentPathToArray = this.isDocumentPathToArray(documentPath);
    const arrayPath = isDocumentPathToArray && documentPath.split('.').slice(0, -1).join('.');
    const needToCreateArray = isDocumentPathToArray && _.get(document.data, arrayPath) === undefined;
    const isPlaceholder = !!(attachment && attachment.isAttachmentPlaceholder);
    const metaData = isPlaceholder ? undefined : (attachment && attachment.meta) || {};
    const attachmentInfoToSave = { ...attachment, metaData };

    // Prepare properties update struct.
    const properties = needToCreateArray
      ? [{ path: arrayPath, value: [attachmentInfoToSave] }]
      : [{ path: documentPath, value: attachmentInfoToSave }];

    // Update document.
    await this.host.update(documentId, properties, userId, userUnitIds, isFromSystemTask, isKeepDocumentFile);
  }

  /**
   * Add generating pdf to queue.
   * @param document Document.
   * @param userId User ID.
   */
  async addGeneratingPdfToQueue(document: any, userId: string): Promise<void> {
    if (document.fileId === 'generating' && global.redisClient && (await global.redisClient.get(`generating-pdf-document-${document.id}`))) {
      return;
    }

    await (global.models.document.addDocumentFile as any)({
      id: document.id,
      updatedBy: userId,
      fileId: 'generating',
      fileName: null,
      fileType: null,
    });

    // Send message to RabbitMQ.
    const message = { documentId: document.id, userId: userId };
    global.messageQueue.produce(message, 'writingPdf', 'bpmn-task-incoming-generating-pdf');

    if (global.redisClient) {
      global.redisClient.set(`generating-pdf-document-${document.id}`, true, 3600);
    }
  }

  /**
   * Create pdf.
   */
  async createPdf({ document, userId }: { document: any; userId: string }): Promise<Buffer> {
    const documentId = document.id;
    const workflow = await global.models.workflow.findById(document.task.workflowId);
    if (!workflow) {
      throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
    }

    // Get template data.
    const documentTemplate = await global.models.documentTemplate.findById(document.documentTemplateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }

    global.log.save('create-pdf', { cfg: global.config });
    const { variables, ...staticFileOptions } = global.config.file_generator;

    // Define file HTMLs.
    const htmls = [];
    // Create PDF.
    const htmlsString = await this.host.fileGeneratorService.createHtml({
      workflow,
      documentTemplate,
      document,
      staticFileOptions,
      variables,
    });
    const { htmlTemplateDelimiter, htmlTemplateDelimiterEnd } = staticFileOptions;
    const allHtmls = htmlsString.split(htmlTemplateDelimiter);
    for (const allHtml of allHtmls) {
      // Define HTML parts.
      const allHtmlParts = allHtml.split(htmlTemplateDelimiterEnd);

      // Check if without condition.
      if (allHtmlParts.length === 1) {
        const [currentHtml] = allHtmlParts;
        htmls.push(currentHtml);
      }

      // Check if with condition.
      if (allHtmlParts.length === 2) {
        const [condition, currentHtml] = allHtmlParts;
        const conditionResult = this.host.sandbox.evalWithArgs(condition, [document.data], { meta: { fn: 'htmlsString.condition', documentId } });
        if (conditionResult) {
          htmls.push(currentHtml);
        }
      }

      // Check if wrong schema.
      if (allHtmlParts.length > 2) {
        global.log.save('html-schema-delimiter-error', { allHtmls, currentHtmlWithError: allHtmlParts }, 'error');
        throw new Error('Wrong HTML schema delimiters.');
      }
    }

    // Handle all HTML templates.
    let mainPdfBuffer;
    let mainFileId;
    const attachmentIds = [];
    let mainPdfFileName;
    let mainPdfFileSize;
    const attachesPdfFileNames = [];
    const attachesPdfFileSizes = [];
    let attachesMetaData = {};

    for (const htmlIndex in htmls) {
      // Define HTML.
      let html = htmls[htmlIndex];

      // Create and upload file.
      const pdfFileNameSchema =
        typeof documentTemplate.jsonSchema.fileName === 'string'
          ? this.host.sandbox.evalWithArgs(documentTemplate.jsonSchema.fileName, [document.data], {
              checkArrow: true,
              meta: { fn: 'documentTemplate.jsonSchema.fileName', documentId },
            })
          : documentTemplate.jsonSchema.fileName;

      const pdfFileName =
        typeof pdfFileNameSchema === 'undefined'
          ? `${documentTemplate.name}${htmlIndex === '0' ? '' : '-' + (+htmlIndex + 1)}.pdf`
          : Array.isArray(pdfFileNameSchema)
            ? `${pdfFileNameSchema[htmlIndex]}.pdf`
            : `${pdfFileNameSchema}${htmlIndex === '0' ? '' : '-' + (+htmlIndex + 1)}.pdf`;

      const [subPdfNameRes] = html.matchAll(NAME_TAG_REGEX);
      const subPdfName = subPdfNameRes ? subPdfNameRes[1] : null;

      // Check if landscape PDF orientation.
      const landscapeFormat = !!html.match('<landscape_orientation>');

      // Check if borders defined.
      const getTagContentByPattern = (pattern) => {
        const borderValue =
          ((((html.match(pattern) || [])[0] || '').match(/>.+</gi) || [])[0] || '')
            .split('')
            .filter((v) => !['>', '<'].includes(v))
            .join('') || null;
        const toRemove = (html.match(pattern) || [])[0];
        if (toRemove) {
          html = html.replace(toRemove, '');
        }
        return borderValue;
      };
      const pdfBorderTop = getTagContentByPattern(/<pdf-border-top>.+<\/pdf-border-top>/gi);
      const pdfBorderRight = getTagContentByPattern(/<pdf-border-right>.+<\/pdf-border-right>/gi);
      const pdfBorderBottom = getTagContentByPattern(/<pdf-border-bottom>.+<\/pdf-border-bottom>/gi);
      const pdfBorderLeft = getTagContentByPattern(/<pdf-border-left>.+<\/pdf-border-left>/gi);
      const pdfFooterHeight = getTagContentByPattern(/<pdf-footer-height>.+<\/pdf-footer-height>/gi);
      const pdfFormat = getTagContentByPattern(/<pdf-format>.+<\/pdf-format>/gi);
      const pdfHeight = getTagContentByPattern(/<pdf-height>.+<\/pdf-height>/gi);
      const pdfWidth = getTagContentByPattern(/<pdf-width>.+<\/pdf-width>/gi);

      const bufferStream = (PassThrough as any)();
      const pdfOptions: any = {
        orientation: landscapeFormat ? 'landscape' : 'portrait',
        border: {},
      };
      if (staticFileOptions.timeout) {
        pdfOptions.timeout = staticFileOptions.timeout;
      }
      if (pdfBorderTop) {
        pdfOptions.border.top = pdfBorderTop;
      }
      if (pdfBorderRight) {
        pdfOptions.border.right = pdfBorderRight;
      }
      if (pdfBorderBottom) {
        pdfOptions.border.bottom = pdfBorderBottom;
      }
      if (pdfBorderLeft) {
        pdfOptions.border.left = pdfBorderLeft;
      }
      if (pdfFooterHeight) {
        pdfOptions.footer = { height: pdfFooterHeight };
      }
      if (pdfFormat) {
        pdfOptions.format = pdfFormat;
      }
      if (pdfHeight) {
        pdfOptions.height = pdfHeight;
      }
      if (pdfWidth) {
        pdfOptions.width = pdfWidth;
      }

      const pdfBuffer = await this.host.fileGeneratorService.createPdf(html, pdfOptions);
      bufferStream.end(pdfBuffer);

      const fileInfo = await this.host.storageService.provider.uploadFileFromStream(
        bufferStream,
        pdfFileName,
        undefined,
        APLICATION_PDF,
        pdfBuffer.length,
      );

      const { id: fileId } = fileInfo;

      // Set main PDF and attaches params.
      if (htmlIndex === '0') {
        mainPdfBuffer = pdfBuffer;
        mainFileId = fileId;
        mainPdfFileName = pdfFileName;
        mainPdfFileSize = pdfBuffer.length;
      } else {
        attachmentIds.push(fileId);
        attachesPdfFileNames.push(subPdfName ? `${subPdfName}.pdf` : pdfFileName);
        attachesPdfFileSizes.push(pdfBuffer.length);
        attachesMetaData = nodeHtmlParser
          .parse(html)
          .querySelectorAll('meta[name="metaData"]')
          .reduce(
            (acc, cur) => ({
              ...acc,
              [cur.getAttribute('key')]: cur.getAttribute('value'),
            }),
            {},
          );
      }
    }

    // Delete exist signatures and rejections.
    if (document.task && document.task.signerUsers && document.task.signerUsers.length > 0) {
      await global.models.documentSignature.deleteByDocumentId(documentId);
      await global.models.documentSignatureRejection.deleteByDocumentId(documentId);
    }

    // Add file id, name, type if not exist
    if (!document.fileId) document.fileId = mainFileId;
    if (!document.fileName) document.fileName = mainPdfFileName;
    if (!document.fileType) document.fileType = APLICATION_PDF;

    // Add document file.
    const created = await (global.models.document.addDocumentFile as any)({
      id: documentId,
      updatedBy: userId,
      fileId: mainFileId,
      fileName: mainPdfFileName,
      fileType: APLICATION_PDF,
      fileSize: mainPdfFileSize,
    });
    if (!created) {
      throw new Error("Can't add file.");
    }

    // Delete last attachments.
    await global.models.documentAttachment.deleteGeneratedByDocumentId(documentId);

    // Save attachments.
    const attachments = [];
    for (const attachmentIndex in attachmentIds) {
      const attachment = await (global.models.documentAttachment.create as any)({
        documentId,
        name: attachesPdfFileNames[attachmentIndex],
        type: APLICATION_PDF,
        link: attachmentIds[attachmentIndex],
        size: attachesPdfFileSizes[attachmentIndex],
        isGenerated: true,
        meta: attachesMetaData,
      });
      attachments.push(attachment);
    }

    return mainPdfBuffer;
  }

  /**
   * Create PDF from message.
   * @param messageObject AMQP message object.
   */
  async createPdfFromMessage(messageObject: any): Promise<boolean> {
    try {
      const document: any = await global.models.document.findById(messageObject.documentId);
      if (!document) {
        throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
      }
      const documentSignatures = await (global.models.documentSignature.getByDocumentId as any)(messageObject.documentId);
      const documentSignatureRejections = await (global.models.documentSignatureRejection.getByDocumentId as any)(messageObject.documentId);
      document.signatures = documentSignatures;
      document.signatureRejections = documentSignatureRejections;

      const pdf = await this.createPdf({ document, userId: messageObject.userId });
      if (!pdf) {
        throw new Error("PDF wasn't created.");
      }
    } catch (error) {
      global.log.save('pdf-creating-by-message-from-queue-error', { messageObject, error: (error && error.message) || error });

      // If it errors, will delete state generating pdf.
      await (global.models.document.addDocumentFile as any)({
        id: messageObject.documentId,
        updatedBy: messageObject.userId,
        fileId: null,
        fileName: null,
        fileType: null,
        fileSize: null,
      });
    }

    if (global.redisClient) {
      global.redisClient.delete(`generating-pdf-document-${messageObject.documentId}`);
    }

    return true;
  }

  async saveExternalPdf(
    pdf: { name: string; contentType: string; contentLength?: string; fileContent: string },
    documentId: string,
    userId: string,
  ): Promise<any> {
    const bufferStream = (PassThrough as any)();
    bufferStream.end(Buffer.from(pdf.fileContent, 'base64'));
    const fileInfo = await this.host.storageService.provider.uploadFileFromStream(
      bufferStream,
      pdf.name,
      'External PDF',
      pdf.contentType,
      Buffer.from(pdf.fileContent, 'base64').length,
    );

    // Add document file.
    const result = await (global.models.document.addDocumentFile as any)({
      id: documentId,
      updatedBy: userId,
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      fileType: fileInfo.contentType,
    });
    return result;
  }

  /**
   * Is document path to array.
   * @param path Document path.
   * @returns As document path to array indicator.
   */
  isDocumentPathToArray(path: string): boolean | undefined {
    // Check.
    if (typeof path !== 'string') {
      return;
    }

    // Define if last key is a number (path to array).
    const [lastKey] = path.split('.').reverse();
    const isLastKeyNumber = (lastKey as any) == parseInt(lastKey);
    return isLastKeyNumber;
  }
}

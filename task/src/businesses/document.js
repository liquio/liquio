const axios = require('axios');
const PropByPath = require('prop-by-path');
const crypto = require('crypto');
const https = require('https');
const flattening = require('flattening');
const _ = require('lodash');
const { Readable, PassThrough } = require('stream');
const nodeHtmlParser = require('node-html-parser');

const { JSONPath } = require('../lib/jsonpath');
const Business = require('./business');
const Eds = require('../lib/eds');
const Stream = require('../lib/stream');
const DownloadToken = require('../lib/download_token');
const ExternalReader = require('../lib/external_reader');
const StorageService = require('../services/storage');
const DocumentValidator = require('../services/document_validator');
const DocumentFiller = require('../services/document_filler');
const VerifiedUserInfoFiller = require('../services/document_filler/fillers/verified_user_info');
const PaymentService = require('../services/payment');
const Paths = require('../services/document_validator/paths');
const Auth = require('../services/auth');
const Notifier = require('../services/notifier');
const RegisterService = require('../services/register');
const FileGeneratorService = require('../services/file_generator');
const DocumentAttachmentModel = require('../models/document_attachment');
const TaskActivity = require('../types/task_activity');
const UnitModel = require('../models/unit');
const Helpers = require('../lib/helpers');
const NumberGenerator = require('../lib/number_generator');
const typeOf = require('../lib/type_of');
const Sandbox = require('../lib/sandbox');
const {
  EvaluateSchemaFunctionError,
  InvalidSchemaError,
  NotFoundError,
  InvalidParamsError,
  InvalidConfigError,
  BadRequestError,
  ForbiddenError,
} = require('../lib/errors');
const {
  ERROR_DOCUMENT_ALREADY_COMMITTED,
  ERROR_UPDATE_DOCUMENT,
  ERROR_WORKFLOW_NOT_FOUND,
  ERROR_DOCUMENT_TEMPLATE_NOT_FOUND,
  ERROR_DOCUMENT_NOT_FOUND,
} = require('../constants/error');

// Constants.
const SIGNATURE_ENCODING = 'utf8';
const EMPTY_DOCUMENT_DATA = '{}';
const DOCUMENT_PREVIEW_SCHEMA_CONTROL = 'preview.document';
const DIRECT_DOCUMENT_PREVIEW_SCHEMA_CONTROL = 'preview.document.direct';
const CALCULATED_PAYMENT_PATH = 'calculated';
const PROCESSED_PAYMENT_PATH = 'processed';
const CONFIRM_CODE_INFO_PATH = 'confirmCodeStatus';
const CALCULATED_PAYMENT_HISTORY_PATH = 'calculatedHistory';
const UNHOLD_PAYMENT_PATH = 'unhold';
const LETTER_FOR_SIGNERS_TEMPLATE_ID = 2;
const PAYMENT_CONTROL_NAME = 'payment';
const PAYMENT_CONTROL_WIDGET_NAME = 'payment.widget';
const PAYMENT_CONTROL_WIDGET_NEW_NAME = 'payment.widget.new';
const HIDE_REPLACEMENT_TEXT = '*****';
const SIGNATURE_TYPE_DATA = 'data';
const SIGNATURE_TYPE_DATA_EXTERNAL = 'dataExternal';
const SIGNATURE_TYPE_HASH = 'hash';
const SIGNATURE_TYPE_TAX_SIGN_ENCRYPT_SIGN = 'taxSignEncryptSign';
const EVENT_FILE_DOCUMENT_TEMPLATE_ID = 999999999;
const APLICATION_PDF = 'application/pdf';
const NAME_TAG_REGEX = /<meta name=['|"]{1}description['|"]{1} content=['|"]{1}([waА-Яа-яёЁЇїІіЄєҐґ \-()[\]{}]{1,200})['|"]{1}[ />|>| >]/gim;

const ERROR_GET_DATA_FOR_SIGN = 'Can\'t get data for sign.';
const ERROR_WRONG_SIGNED_RECORDS_COUNT = 'Wrong signed records count.';
const ERROR_DEFINE_SIGNATURE_INFO = 'Can\'t define signature info.';
const ERROR_SIGNED_CONTENT_NOT_MATCH = 'Signed content not match needed.';
const ERROR_ATTACHMENT_FILE_NOT_FOUND = 'Attachment file link not found.';
const ERROR_GET_PAYMENT_DATA = 'Can\'t get payment data.';
const ERROR_NOT_ALL_FILES_ARE_SIGNED = 'Not all files are signed (P7S).';
const ERROR_DOCUMENT_ACCESS = 'User doesn\'t have any access to document.';

/**
 * Documents business.
 * @typedef {import('../entities/document')} DocumentEntity
 * @typedef {import('../entities/task_template')} TaskTemplateEntity
 * @typedef {import('../entities/unit')} UnitEntity
 */
class DocumentBusiness extends Business {
  /**
   * Document business constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!DocumentBusiness.singleton) {
      super(config);
      this.storageService = new StorageService();
      this.eds = new Eds(config.eds);
      this.downloadToken = new DownloadToken(config.download_token);
      this.documentFiller = new DocumentFiller();
      this.verifiedUserInfoFiller = new VerifiedUserInfoFiller();
      this.paymentService = new PaymentService(config.payment);
      this.auth = new Auth().provider;
      this.notifier = new Notifier();
      this.registerService = new RegisterService();
      this.fileGeneratorService = new FileGeneratorService();
      this.externalReader = new ExternalReader();
      this.documentAttachmentModel = new DocumentAttachmentModel();
      this.unitModel = new UnitModel();
      this.numberGenerator = new NumberGenerator();
      this.sandbox = new Sandbox();
      DocumentBusiness.singleton = this;
    }
    return DocumentBusiness.singleton;
  }

  /**
   * Get for sign by user.
   * @param {string} userId User ID.
   * @returns {Promise<DocumentEntity[]>} Document entities promise.
   */
  async getForSignByUser(userId) {
    return await models.document.getForSignByUser(userId);
  }

  /**
   * To Base64.
   * @param {string} rawString RAW string.
   * @param {'utf8'|'hex'} [rawStringEncoding] RAW string encoding. Default value: `utf8`.
   * @returns {string} Base64 string.
   */
  toBase64(rawString = '', rawStringEncoding = 'utf8') {
    return Buffer.from(rawString, rawStringEncoding).toString('base64');
  }

  /**
   * Check ASIC manifest files.
   * @param {{asicmanifestFileId: string, filesIds: string[]}} asicInfo ASIC info.
   * @param {string[]} filesIds Files IDs to compare.
   * @returns {boolean} The same ASIC manifest files indicator.
   */
  checkAsicManifestFiles(asicInfo, filesIds) {
    // Get ASIC manifest files IDs.
    const { filesIds: asicManifestFilesIds = [] } = asicInfo;

    // Check length.
    if (asicManifestFilesIds.length !== filesIds.length) {
      return false;
    }

    // Check all elements.
    const someFileIdNotExistInAsicManifest = filesIds.some((v) => !asicManifestFilesIds.includes(v));
    if (someFileIdNotExistInAsicManifest) {
      return false;
    }

    // Return `true` in other cases.
    return true;
  }

  /**
   * Get data for sign.
   * @param {string} documentId Document ID.
   * @returns {Promise<{fileId: string, dataForSign: string}>} Data for sign promise.
   */
  async getDataForSign(documentId) {
    try {
      // Get document.
      const document = await models.document.findById(documentId);
      if (!document) {
        throw new Error(ERROR_GET_DATA_FOR_SIGN);
      }

      // Get document generated static file hash.
      const staticFileId = document.fileId;
      const staticFileInfo = staticFileId && (await this.storageService.provider.getFileInfo(staticFileId));
      if (!staticFileInfo) {
        throw new NotFoundError('Main PDF file not found.');
      }
      const staticFileHash = {
        fileId: staticFileId,
        dataForSign: this.toBase64(staticFileInfo && (staticFileInfo.hash.sha256 || staticFileInfo.hash.sha1), 'hex'),
      };

      // Get document attachments files hashes.
      const {
        jsonSchema: { filterAttachmentToSign: filterAttachmentToSignFunction },
      } = await models.documentTemplate.findById(document.documentTemplateId);

      const filterAttachmentToSign = this.sandbox.eval(filterAttachmentToSignFunction) || (() => true);

      const attachments = await models.documentAttachment.getByDocumentId(documentId);
      const attachmentInfos = [];
      for (const attachment of attachments) {
        const attachmentFileInfo = await this.storageService.provider.getFileInfo(attachment.link);
        attachmentInfos.push(attachmentFileInfo);
      }

      const filteredAttachments = attachmentInfos.filter(filterAttachmentToSign);

      const attachmentsFilesHashes = filteredAttachments.map((attachmentFileInfo) => ({
        fileId: attachmentFileInfo.id,
        dataForSign: this.toBase64(attachmentFileInfo.hash.sha256 || attachmentFileInfo.hash.sha1, 'hex'),
      }));

      // Get all files hashes as objects `{fileId, dataForSign}` list.
      const filesHashes = [staticFileHash, ...attachmentsFilesHashes].filter((v) => !!(v && v.dataForSign));
      const filesIds = filesHashes.map((v) => v.fileId);

      // Get existing ASIC manifest.
      const asicInfo = document.asic || {};
      let { asicmanifestFileId } = asicInfo;

      // Check ASIC manifest files and generate new if need it.
      const theSameAsicManifestFiles = this.checkAsicManifestFiles(
        asicInfo,
        filesHashes.map((v) => v.fileId),
      );
      if (!theSameAsicManifestFiles) {
        // Generate new ASIC manifest.
        let data = {};
        if (global.config.asic?.manifest === true) {
          data = document.data;
        }
        const generatedAsicManifest = await this.storageService.provider.createAsicManifest(filesIds, data);
        asicmanifestFileId = generatedAsicManifest.id;

        // Save ASIC info.
        await models.document.setAsicInfo(documentId, { asicmanifestFileId, filesIds });
      }

      // Get ASIC manifest content.
      const asicManifestP7sRequestOptions = await this.storageService.provider.getP7sSignatureRequestOptions(asicmanifestFileId, true);
      const asicManifestRequestOptions = await this.storageService.provider.downloadFileRequestOptions(asicmanifestFileId);
      let asicmanifestContent;
      try {
        asicmanifestContent = (await axios(asicManifestP7sRequestOptions)).data;
      } catch (error) {
        log.save(
          'try-to-get-asic-manifest-p7s-error',
          { asicManifestP7sRequestOptions, error: { message: error.message, stack: error.stack } },
          'warn',
        );
      }
      if (!asicmanifestContent) {
        asicmanifestContent = (await axios(asicManifestRequestOptions)).data;
      }
      const asicManifestHash = {
        fileId: asicmanifestFileId,
        dataForSign: this.toBase64(asicmanifestContent),
      };

      return [asicManifestHash, ...filesHashes];
    } catch (error) {
      log.save('try-to-get-asic-manifest-error', { message: error.message, stack: error.stack }, 'error');
      throw new Error(ERROR_GET_DATA_FOR_SIGN, { cause: error });
    }
  }

  /**
   * Sign.
   * @param {string} documentId Document ID.
   * @param {string[]} signature Signature.
   * @param {string} userId User ID.
   * @param {boolean} isUserPemCouldBeMock Is user sign pem could be mock indicator.
   * @param {boolean} isUserSignatureCouldBeMock Is user sign could be mock indicator.
   * @param {object} userInfo User info from ID.
   * @param {object} sendLetterToSignerContext Send letter to signer context.
   * @param {string} type Signature type.
   * @returns {Promise<object>} Signed document promise.
   */
  async sign(documentId, signature, userId, isUserPemCouldBeMock, isUserSignatureCouldBeMock, userInfo, sendLetterToSignerContext, type) {
    // Check if this sign test and define params.
    let signatureList;
    let signatureBuffer;
    if (!isUserSignatureCouldBeMock) {
      const isList = Array.isArray(signature);
      signatureList = isList ? signature : [signature];
      const signatureForBuffer = isList ? JSON.stringify(signatureList) : signature;
      signatureBuffer = Buffer.from(signatureForBuffer, SIGNATURE_ENCODING);
    } else {
      signatureBuffer = false;
    }

    const isUserAlreadySigned = !!(await models.documentSignature.getByDocumentId(documentId, userId))?.length;
    if (isUserAlreadySigned) {
      models.workflowError.create({
        error: 'User already signed.',
        details: `User ${userId} tried to re-signed data. Check 'Information about sign' (Key icon).`,
        traceMeta: this.getTraceMeta(),
      });
    }

    // Get data for sign.
    const dataForSignWithFileIds = await this.getDataForSign(documentId);
    const fileIdsList = dataForSignWithFileIds.map((v) => v.fileId);
    const dataForSignList = dataForSignWithFileIds.map((v) => v.dataForSign);

    // Check if signet records count equals data for sign records count (if could not be mock).
    if (!(isUserPemCouldBeMock || isUserSignatureCouldBeMock) && signatureList && signatureList.length !== dataForSignList.length) {
      throw new Error(ERROR_WRONG_SIGNED_RECORDS_COUNT);
    }

    // Check all signatures (if could not be mock).
    let pemBuffer;
    let signatures = []; // Initialize signatures array for tracking processed signatures
    if (!(isUserPemCouldBeMock || isUserSignatureCouldBeMock) && signatureList) {
      let content;
      let pem;
      for (let i = 0; i < signatureList.length; i++) {
        // Define params.
        const signatureRecord = signatureList[i];
        const dataForSignRecord = dataForSignList[i];
        const fileId = fileIdsList[i];

        // Get signature info.
        let signatureInfo;
        if (i === 0) {
          // For PKCS7 provider, always pass expected content since signatures are detached
          if (this.eds.provider.constructor.name === 'Pkcs7EdsProvider' || this.eds.provider.constructor.name === 'pkcs7') {
            global.log.save('document-sign-using-pkcs7-path', 'Using PKCS7 detached signature path', 'info');

            signatureInfo = await this.eds.getSignatureInfo(signatureRecord, dataForSignRecord);
          } else {
            global.log.save('document-sign-using-attached-path', 'Using attached signature path', 'info');
            signatureInfo = await this.eds.getSignatureInfo(signatureRecord);
          }
        } else {
          if (this.eds.provider.constructor.name === 'Pkcs7EdsProvider' || this.eds.provider.constructor.name === 'pkcs7') {
            global.log.save(
              'document-sign-subsequent-pkcs7',
              {
                signatureIndex: i,
                message: 'Processing subsequent signature with PKCS7 provider',
              },
              'info',
            );
            signatureInfo = await this.eds.getSignatureInfo(signatureRecord, dataForSignRecord);
          } else {
            signatureInfo = await this.eds.getSignatureInfo(signatureRecord, dataForSignRecord);
          }
        }

        // Handle the case where signatureInfo is null (e.g., for raw signatures)
        if (!signatureInfo) {
          if (i === 0) {
            // First signature should always be processable
            throw new Error('Failed to process first signature - this should be a valid PKCS#7 signature');
          } else {
            // Add a placeholder signature object to maintain indexing
            signatures.push({
              type: 'raw',
              index: i,
              processed: false,
              reason: 'Raw signature - cannot extract certificate info',
            });
            continue;
          }
        }

        if (typeof signatureInfo !== 'object') {
          throw new Error(ERROR_DEFINE_SIGNATURE_INFO);
        }

        if (i === 0) {
          ({ content, pem } = signatureInfo);
        } else {
          content = dataForSignRecord;
        }

        let contentString;
        try {
          contentString = content ? content.toString(SIGNATURE_ENCODING) : null;
        } catch {
          throw new Error('Can\'t define signed content.');
        }

        // Check signature.
        if (contentString !== dataForSignRecord && i === 0) {
          const error = new Error(ERROR_SIGNED_CONTENT_NOT_MATCH);
          error.details = {
            contentString,
            dataForSignRecord,
          };
          throw error;
        }

        // Only check user info match for the first signature (PKCS#7),
        // subsequent signatures are raw hashes and don't contain certificate info
        if (i === 0) {
          this.checkUserInfoMatchToSignatureInfo(userInfo, signatureInfo);
        } else {
          global.log.save(
            'skipping-ipn-validation-for-subsequent-signature',
            {
              signatureIndex: i,
              message: 'Skipping IPN validation for subsequent signature (raw hash)',
            },
            'info',
          );
        }

        pemBuffer = Buffer.from(pem, SIGNATURE_ENCODING);

        // Save signature to file storage. Not required.
        (async () => {
          try {
            // Save ASIC manifest.
            if (i === 0) {
              const savedToFilestorageP7sSignature = await this.storageService.provider.addP7sSignature(fileId, signatureRecord);
              log.save('save-p7s-signature-to-filestorage-result', {
                savedToFilestorageP7sSignature: {
                  ...(savedToFilestorageP7sSignature || {}),
                  p7s: HIDE_REPLACEMENT_TEXT,
                },
              });
            }

            // Save other files.
            const savedToFilestorageSignature = await this.storageService.provider.addSignature(fileId, dataForSignRecord, signatureRecord, pem, {
              type,
            });
            log.save('save-signature-to-filestorage-result', {
              savedToFilestorageSignature: {
                ...(savedToFilestorageSignature || {}),
                signature: HIDE_REPLACEMENT_TEXT,
              },
            });
          } catch (error) {
            log.save(
              'save-signature-to-filestorage-error',
              {
                error: error && error.message,
                fileId,
                dataForSignRecord,
                signatureRecord,
                pem,
              },
              'error',
            );
          }
        })();
      }
    }

    // Sign.
    const mockSignatureBufferIfNeedIt = isUserSignatureCouldBeMock ? Buffer.from('SIGN_MOCK') : undefined;
    const mockPemBufferIfNeedIt = isUserPemCouldBeMock ? Buffer.from('PEM_MOCK') : undefined;
    const isSigned = await models.documentSignature.create({
      documentId,
      createdBy: userId,
      signature: signatureBuffer || mockSignatureBufferIfNeedIt,
      type,
      certificate: pemBuffer || mockPemBufferIfNeedIt,
    });
    if (!isSigned) {
      throw new Error('Can\'t sign document.');
    }

    // Get signed document.
    const signedDocument = await models.document.findById(documentId);
    if (!signedDocument) {
      throw new Error('Can\'t get signed document.');
    }

    // Add multiSignInfo.
    await this.addMultiSignInfo(signedDocument.task, { userInfo, type: 'sign' });

    // Append signatures info.
    const documentSignatures = await models.documentSignature.getByDocumentId(documentId);
    const documentSignatureRejections = await models.documentSignatureRejection.getByDocumentId(documentId);
    signedDocument.signatures = documentSignatures;
    signedDocument.signatureRejections = documentSignatureRejections;

    // Append min signatures limit raised.
    const minSignaturesLimitInfo = await this.handleMinSignaturesLimit(signedDocument, true, sendLetterToSignerContext);
    signedDocument.minSignaturesLimitInfo = minSignaturesLimitInfo;

    // Return signed document.
    return signedDocument;
  }

  /**
   * Handle min signatures limit.
   * @param {{documentTemplateId, signatures: {createdBy}[], task: {signerUsers}}} signedDocument Signed document.
   * @param {boolean} [inform] Inform task performer if min signatures limit raised.
   * @param {object} [sendLetterToSignerContext] Send letter to signer context.
   * @returns {minSignaturesLimit, signaturesCurrentPercent, signaturesCount, signerUsersCount, isMinSignaturesLimitRaised} Min signatures limit info.
   */
  async handleMinSignaturesLimit(signedDocument, inform = false, sendLetterToSignerContext) {
    // Define params.
    const { documentTemplateId, signatures = [], task: { signerUsers = [] } = {} } = signedDocument;
    const signaturesUserIds = [...new Set(signatures.map((v) => v.createdBy))];
    const signerUserIds = [...new Set(signerUsers)];
    const signaturesCount = signaturesUserIds.length;
    const signerUsersCount = signerUserIds.length;

    // Check if multisigners not defined.
    if (signerUsersCount < 1) {
      return null;
    }

    // Get multisigner control params.
    let multisignerControl;
    try {
      multisignerControl = await this.getMultisignerControl(documentTemplateId);
    } catch (error) {
      log.save('sign-document-get-multisigner-control-error', error, 'error');
      throw error;
    }
    if (!multisignerControl) {
      throw new NotFoundError('Can\'t find multisigner control.');
    }
    const { minSignaturesLimit } = multisignerControl;

    // Check if no need to handle signatures min limit.
    if (!minSignaturesLimit) {
      return null;
    }

    // Define min signatures limit is raised.
    const signaturesCurrentPercent = (signaturesCount / signerUsersCount) * 100;
    const isMinSignaturesLimitRaised = signaturesCurrentPercent >= minSignaturesLimit;

    // Signatures min limit info container.
    let minSignaturesLimitInfo = {
      minSignaturesLimit,
      signaturesCurrentPercent,
      signaturesCount,
      signerUsersCount,
      isMinSignaturesLimitRaised,
    };

    // Check if min signatures limit is not raised.
    if (!isMinSignaturesLimitRaised) {
      return minSignaturesLimitInfo;
    }

    // Check if no needs to inform task performer.
    if (!inform) {
      return minSignaturesLimitInfo;
    }

    // Handle if signatures limit is raised - send message.
    this.sendLetterToSigners(
      sendLetterToSignerContext.document,
      sendLetterToSignerContext.task,
      sendLetterToSignerContext.signers,
      sendLetterToSignerContext.userId,
      false,
      true,
      false,
      true,
    );

    return minSignaturesLimitInfo;
  }

  /**
   * Get data for sign P7S.
   * @param {string} documentId Document ID.
   * @param {string} attachmentId Attachment ID.
   * @param {string} userId User ID.
   * @returns {Promise<{p7s: ReadableStream, fileLink: string, fileName: string}>|Promise<{p7s: Buffer, fileLink: string, fileName: string}>} Data for sign promise.
   */
  async getDataForSignP7s(documentId, attachmentId, userId) {
    // Get document file link.
    const document = await models.document.findById(documentId);
    if (!document) {
      throw new Error(ERROR_GET_DATA_FOR_SIGN);
    }
    const documentFileLink = document.fileId;
    const documentFileName = document.fileName;

    // Get attachment file link.
    let attachmentFileLink;
    let attachmentFileName;
    if (attachmentId) {
      const attachmentFileLinkAndName = await this.getAttachmentFileLink(documentId, attachmentId, true);
      attachmentFileLink = attachmentFileLinkAndName.fileLink;
      attachmentFileName = attachmentFileLinkAndName.fileName;
    }

    // Define file link.
    const fileLink = attachmentFileLink || documentFileLink;
    const fileName = attachmentFileName || documentFileName;

    // Try to get P7S.
    const p7sSignature = await this.storageService.provider.getP7sSignature(fileLink, false, userId);
    const { p7s: p7sBase64 } = p7sSignature || {};
    if (p7sBase64) {
      // Return the attachment P7S signature for multi signing possibility.
      const p7sBuffer = Buffer.from(p7sBase64, 'base64');
      return { p7s: p7sBuffer, fileLink, fileName };
    }

    // Get file in other cases.
    const fileReadableStream = await this.storageService.provider.downloadFile(fileLink);
    return { p7s: fileReadableStream, fileLink, fileName };
  }

  /**
   * Sign P7S.
   * @param {string} documentId Document ID.
   * @param {string} attachmentId Attachment ID.
   * @param {string[]} p7sSignature P7S signature.
   * @param {boolean} isUserSignatureCouldBeMock Is user sign could be mock indicator.
   * @param {object} userInfo User info from ID.
   * @returns {Promise<{isP7sSigned: true}>} P7S signature result.
   */
  async signP7s(documentId, attachmentId, p7sSignature, isUserSignatureCouldBeMock, userInfo, isExternalP7sSign = false) {
    // Get data for sign P7S.
    const dataForSignP7s = await this.getDataForSignP7s(documentId, attachmentId, userInfo.userId);
    const { p7s, fileLink } = dataForSignP7s;

    // Set equal (can be buffer).
    let dataForSignBuffer = p7s;

    // Read stream to buffer if not a buffer.
    if (!Buffer.isBuffer(p7s)) {
      let p7sContent = [];
      p7s.on('data', (chunk) => p7sContent.push(chunk));
      await Stream.waitEndEvent(p7s);
      dataForSignBuffer = Buffer.concat(p7sContent);
    }

    // Check P7S signature (if could not be mock).
    if (!isUserSignatureCouldBeMock) {
      // Get signature info.
      const signatureInfo = await this.eds.getSignatureInfo(p7sSignature, undefined, isExternalP7sSign, dataForSignBuffer);
      if (!signatureInfo || typeof signatureInfo !== 'object') {
        throw new Error(ERROR_DEFINE_SIGNATURE_INFO);
      }
      const { content, pem } = signatureInfo;

      // Check signature.
      if (!content.equals(dataForSignBuffer)) {
        throw new Error(ERROR_SIGNED_CONTENT_NOT_MATCH);
      }

      this.checkUserInfoMatchToSignatureInfo(userInfo, signatureInfo);

      // Save signature to file storage. Not required.
      try {
        const savedToFilestorageSignature = await this.storageService.provider.addP7sSignature(fileLink, p7sSignature, userInfo);
        log.save('save-p7s-signature-to-filestorage-result', {
          savedToFilestorageSignature: {
            ...(savedToFilestorageSignature || {}),
            p7s: HIDE_REPLACEMENT_TEXT,
          },
        });
      } catch (error) {
        log.save(
          'save-p7s-signature-to-filestorage-error',
          {
            error: error && error.message,
            fileLink,
            p7sSignature,
            pem,
          },
          'error',
        );

        throw new Error('Can\'t save p7s signature.', { cause: error });
      }
    }

    // Return P7S signature result.
    const p7sSignatureResult = { isP7sSigned: true };
    return p7sSignatureResult;
  }

  /**
   * Sign additional P7S.
   * @param {string} documentId Document ID.
   * @param {string[]} p7sSignatureList P7S signature list.
   * @param {boolean} isUserSignatureCouldBeMock Is user sign could be mock indicator.
   * @param {object} userInfo User info from ID.
   * @param {string} cryptCertificate Crypt certificate.
   * @returns {Promise<{isP7sSigned: true}>} P7S signature result.
   */
  async signAdditionalP7s(documentId, p7sSignatureList, isUserSignatureCouldBeMock, userInfo, cryptCertificate) {
    const document = await models.document.findById(documentId);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    if (document.isFinal === true) {
      throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
    }

    // Get data for sign P7S.
    const additionalDataForSignP7s = await this.getAdditionalDataForSignP7s(documentId, true);
    const { userId } = userInfo || {};

    // Check if signed records count equals needed.
    if (p7sSignatureList.length !== additionalDataForSignP7s.length) {
      throw new Error(ERROR_WRONG_SIGNED_RECORDS_COUNT);
    }

    const existsSigns = await models.additionalDataSignature.model.count({
      where: {
        document_id: documentId,
        created_by: userId,
      },
    });

    if (existsSigns > 0) {
      throw new Error('User already signed document additional data.');
    }

    // Handle all additional data for sign records.
    for (let i = 0; i < additionalDataForSignP7s.length; i++) {
      // Define current record to handle.
      let signatureType = SIGNATURE_TYPE_DATA;
      if (additionalDataForSignP7s[i].type && additionalDataForSignP7s[i].type === SIGNATURE_TYPE_HASH) {
        signatureType = SIGNATURE_TYPE_HASH;
      } else if (additionalDataForSignP7s[i].type && additionalDataForSignP7s[i].type === SIGNATURE_TYPE_DATA_EXTERNAL) {
        signatureType = SIGNATURE_TYPE_DATA_EXTERNAL;
      } else if (additionalDataForSignP7s[i].type && additionalDataForSignP7s[i].type === SIGNATURE_TYPE_TAX_SIGN_ENCRYPT_SIGN) {
        signatureType = SIGNATURE_TYPE_TAX_SIGN_ENCRYPT_SIGN;
      }
      const dataForSign = additionalDataForSignP7s[i].content ? additionalDataForSignP7s[i].content : additionalDataForSignP7s[i];
      const meta = additionalDataForSignP7s[i].meta;
      const dataForSignBuffer = Buffer.from(dataForSign, 'base64');
      const p7sSignature = p7sSignatureList[i];

      // Do not check if mock.
      if (isUserSignatureCouldBeMock) {
        break;
      }

      let content;
      let pem;
      if (signatureType !== SIGNATURE_TYPE_TAX_SIGN_ENCRYPT_SIGN) {
        // Get signature info.
        const signatureInfo = await this.eds.getSignatureInfo(
          p7sSignature,
          signatureType === SIGNATURE_TYPE_HASH ? dataForSign : undefined,
          signatureType === SIGNATURE_TYPE_DATA_EXTERNAL ? true : false,
          additionalDataForSignP7s[i].content,
        );
        if (typeof signatureInfo !== 'object') {
          throw new Error(ERROR_DEFINE_SIGNATURE_INFO);
        }
        ({ content, pem } = signatureInfo);

        // Check signature.
        if (signatureType === SIGNATURE_TYPE_DATA && !content.equals(dataForSignBuffer)) {
          const error = new Error(ERROR_SIGNED_CONTENT_NOT_MATCH);
          error.details = {
            contentString: content && content.toString('base64'),
            dataForSignRecord: dataForSignBuffer && dataForSignBuffer.toString('base64'),
          };
          throw error;
        }

        this.checkUserInfoMatchToSignatureInfo(userInfo, signatureInfo);
      }

      // Save signature to file storage. Not required.
      try {
        const saveAdditionalSignatureResult = await models.additionalDataSignature.create({
          documentId,
          data: dataForSign,
          signature: p7sSignature,
          certificate: pem ? pem : '',
          cryptCertificate: cryptCertificate,
          createdBy: userId,
          meta: meta,
        });
        log.save('save-additional-p7s-signature-result', { saveAdditionalSignatureResult });
      } catch (error) {
        log.save(
          'save-additional-p7s-signature-error',
          {
            error: error && error.message,
            documentId,
            p7sSignature,
            dataForSign,
            userId,
          },
          'error',
        );

        throw new Error('Can\'t save additional p7s signature.', { cause: error });
      }
    }

    // Return additional P7S signature result.
    const additionalP7sSignatureResult = { isAdditionalP7sSigned: true };
    return additionalP7sSignatureResult;
  }

  /**
   * Get additional data for sign P7S.
   * @param {string} documentId Document ID.
   * @param {boolean} [withMeta] With meta.
   * @param {Object} userInfo User info.
   * @returns {Promise<string[]>} Additional data for sign list promise.
   */
  async getAdditionalDataForSignP7s(documentId, withMeta = false, userInfo) {
    // Get document.
    const document = await models.document.findById(documentId);
    if (!document) {
      throw new Error(ERROR_GET_DATA_FOR_SIGN);
    }

    const attachments = await models.documentAttachment.getByDocumentId(document.id);
    document.attachments = attachments;

    const { documentTemplateId } = document;

    // Get document template.
    const documentTemplate = await models.documentTemplate.findById(documentTemplateId);
    const { additionalDataToSign: additionalDataToSignFunction } = documentTemplate;

    // Return if no need to sign additional data.
    if (!additionalDataToSignFunction) {
      return [];
    }

    // Calc additional data to sign.
    let additionalDataToSign;
    try {
      const getFileHash = this.getFileHash.bind(this, document);
      const getHash = this.getHash.bind(this);
      const getFileBase64 = this.getFileBase64.bind(this);
      const getP7sSignature = this.getP7sSignature.bind(this);

      additionalDataToSign = await this.sandbox.evalWithArgs(additionalDataToSignFunction, [document, userInfo], {
        isAsync: true,
        global: {
          getHash,
          getFileHash,
          getFileBase64,
          getP7sSignature,
        },
        meta: { fn: 'additionalDataToSign', documentId },
      });

      if (!additionalDataToSign) {
        throw new Error('Additional data to sign is empty.');
      }
      if (!Array.isArray(additionalDataToSign)) {
        additionalDataToSign = [additionalDataToSign];
      }
      // if (additionalDataToSign.some(v => typeof v !== 'string')) { throw new Error('Additional data to sign should be a list of strings.'); }
    } catch (error) {
      const additionalDataToSignString = JSON.stringify(additionalDataToSign);
      if (additionalDataToSignString && additionalDataToSignString.length > 10000) {
        additionalDataToSign = additionalDataToSignString.slice(0, 10000) + '…';
      }

      let documentString = JSON.stringify(document);
      if (documentString && documentString.length > 10000) {
        documentString = documentString.slice(0, 10000) + '…';
      } else {
        documentString = undefined;
      }

      log.save('calc-additional-data-to-sign-error', {
        error: error && error.message,
        documentTemplateId,
        additionalDataToSignFunction,
        additionalDataToSign,
        document: documentString ?? document,
      });
      throw new Error(ERROR_GET_DATA_FOR_SIGN, { cause: error });
    }

    // Return additional data to sign.
    const additionalDataToSignBase64 = additionalDataToSign.map((v) => {
      if (typeof v.content !== 'undefined') {
        if (withMeta === false) {
          v.meta = undefined;
        }
        return { ...v, content: Buffer.from(v.content).toString('base64') };
      }

      return Buffer.from(v).toString('base64');
    });
    return additionalDataToSignBase64;
  }

  /**
   * Get file hash.
   * @param {object} document Document.
   * @param {string} [fileId] File ID.
   * @returns {Promise<string>}
   */
  async getFileHash(document, fileId) {
    const startTime = Date.now();

    const downloadFileRequestOptions = fileId
      ? await this.storageService.provider.downloadFileRequestOptions(fileId)
      : document.fileId && (await this.storageService.provider.downloadFileRequestOptions(document.fileId));
    if (!downloadFileRequestOptions) {
      log.save('get-file-hash-options-error', { fileId, time: Date.now() - startTime });
      return;
    }
    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'arraybuffer'
    });
    const file = Buffer.from(response.data);
    if (!file) {
      log.save('get-file-hash-download-error', { fileId, time: Date.now() - startTime });
      return;
    }

    const hash = this.getSha512Hash(file);

    log.save('get-file-hash-success', { fileId, hash, time: Date.now() - startTime });

    return hash;
  }

  /**
   * Get md5 hash.
   * @param {string} data Data.
   * @returns {string}
   */
  getMd5Hash(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Get sha512 hash.
   * @param {string} data Data.
   * @param {GetSha512HashOptions} [options] Options.
   * @returns {string}
   *
   * @typedef {object} GetSha512HashOptions
   * @property {string} [hmac] HMAC secret.
   */
  getSha512Hash(data, options) {
    if (options?.hmac) {
      return crypto.createHmac('sha512', options.hmac).update(data).digest('hex');
    }
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  /**
   * Get file base64.
   * @param {string} fileId File ID.
   * @returns {string}
   */
  async getFileBase64(fileId) {
    const downloadFileRequestOptions = await this.storageService.provider.downloadFileRequestOptions(fileId);

    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'arraybuffer'
    });
    const file = Buffer.from(response.data);
    if (!file) {
      return;
    }

    const base64 = file.toString('base64');

    return base64;
  }

  /**
   * Get p7s signature.
   * @param {string} fileId File ID.
   * @returns {string}
   */
  async getP7sSignature(fileId) {
    const file = await this.storageService.provider.getP7sSignature(fileId);

    if (!file) {
      return;
    }

    return file.p7s;
  }

  /**
   * @param {ipn: string, edrpou: string} userInfo
   * @param signatureInfo
   * @return {object} = {error: string|bool, success: bool}
   */
  checkUserInfoMatchToSignatureInfo(userInfo, signatureInfo) {
    if (!userInfo?.ipn) {
      throw new Error('User\'s ipn is empty.');
    }

    const signatureIPN = signatureInfo?.signer?.ipn?.DRFO;
    const signatureEDRPOU = signatureInfo?.signer?.ipn?.EDRPOU;

    // Handle case where certificate IPN could not be extracted
    if (signatureIPN === undefined || signatureIPN === null) {
      log.save(
        'signature-ipn-missing',
        {
          message: 'Certificate IPN could not be extracted from signature',
          userIpn: userInfo.ipn,
          signerInfo: signatureInfo?.signer,
          availableSignerFields: Object.keys(signatureInfo?.signer || {}),
        },
        'warn',
      );

      throw new Error(
        `Certificate IPN could not be extracted from signature. User IPN: '${userInfo.ipn}'. Please check certificate format and extraction logic.`,
      );
    }

    if (signatureIPN !== userInfo.ipn) {
      // Case userInfo.ipn contains only IPN, without EDRPOU.
      if (userInfo.ipn.length <= 10 && userInfo.ipn.indexOf('-') === -1) {
        // For example, if a user has login with one key, but tries to sign with another key.
        throw new Error(`Ipn from sign certificate not match user's ipn. Certificate IPN: '${signatureIPN}', User IPN: '${userInfo.ipn}'.`);
      } else {
        // Case userInfo.ipn contains IPN and EDRPOU separeted '-'. Example '1234567890-87654321'.
        const userIpnSepareted = userInfo.ipn.split('-')[0];
        if (signatureIPN !== userIpnSepareted) {
          throw new Error(
            `Ipn from sign certificate not match user's ipn. Certificate IPN: '${signatureIPN}', User IPN: '${userInfo.ipn}', User IPN separated: '${userIpnSepareted}'.`,
          );
        }
      }
    }

    if ((signatureEDRPOU || userInfo.edrpou) && signatureEDRPOU !== userInfo.edrpou) {
      // For example, if a user has login with legal key, but tries to sign with person key.
      throw new Error('EDRPOU from sign certificate not match user\'s EDRPOU.');
    }

    // Compare user-applicant name and user-signer name.
    const normalizePibToCompare = (...pibElements) => pibElements.join(' ').split(' ').filter(Boolean).join(' ').toLowerCase().replace('(тест)', '');

    const normalizedUserName =
      userInfo?.lastName && userInfo?.firstName && normalizePibToCompare(userInfo.lastName, userInfo.firstName, userInfo.middleName);
    const normalizedSignerUserName =
      signatureInfo?.signer?.surname &&
      signatureInfo?.signer?.givenName &&
      normalizePibToCompare(signatureInfo.signer.surname, signatureInfo.signer.givenName);

    if (normalizedUserName && normalizedSignerUserName && normalizedUserName !== normalizedSignerUserName) {
      const error = new Error('Signed name not match needed.');
      error.details = {
        userInfo: {
          userInfo: {
            lastName: userInfo?.lastName,
            firstName: userInfo?.firstName,
            middleName: userInfo?.middleName,
          },
          signerUserInfo: {
            surname: signatureInfo?.signer?.surname,
            givenName: signatureInfo?.signer?.givenName,
          },
          normalizedUserInfo: '' + normalizedUserName,
          normalizedSignerUserInfo: '' + normalizedSignerUserName,
        },
      };
      throw error;
    }
  }

  /**
   * Is sign available.
   * @param {DocumentEntity} document Document.
   * @param {object} user User info.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units Units.
   * @returns {Promise<boolean>} Is sign required indicator promise.
   */
  async isSignAvailable(document, user, units) {
    // Define params.
    const { id: documentId, documentTemplateId } = document;

    // Get document JSON schema.
    const documentTemplate = await models.documentTemplate.findById(documentTemplateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema: documentJsonSchema } = documentTemplate;

    // Define additional requirements.
    const { isSignAvailable: isSignAvailableFunction } = documentJsonSchema || {};

    // Check additional requirements not defined.
    if (typeof isSignAvailableFunction !== 'string') {
      return true;
    }

    // Check additional requirements.
    let isSignAvailable;
    try {
      isSignAvailable = this.sandbox.evalWithArgs(isSignAvailableFunction, [document, user, units], { meta: { fn: 'isSignAvailable', documentId } });
      log.save('sign-available-function-result', { documentId, isSignAvailableFunction, isSignAvailable });
    } catch (error) {
      log.save('sign-available-function-error', { documentId, isSignAvailableFunction, error: error && error.message, document }, 'error');
      throw new Error('Sign available function error.', { cause: error });
    }

    // Return is sign available indicator.
    return isSignAvailable;
  }

  /**
   * Is continue sign available.
   * @param {DocumentEntity} document Document.
   * @param {object} user User info.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units Units.
   * @returns {Promise<boolean>} Is sign required indicator promise.
   */
  async isContinueSignAvailable(document, user, units) {
    // Define params.
    const { id: documentId, documentTemplateId } = document;

    // Get document JSON schema.
    const documentTemplate = await models.documentTemplate.findById(documentTemplateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema: documentJsonSchema } = documentTemplate;

    // Define additional requirements.
    const { isContinueSignAvailable: isContinueSignAvailableFunction } = documentJsonSchema || {};

    // Check if additional requirement defined as boolean. Return as is in this case.
    if (typeof isContinueSignAvailableFunction === 'boolean') {
      return isContinueSignAvailableFunction;
    }

    // Check additional requirements not defined.
    if (typeof isContinueSignAvailableFunction !== 'string') {
      return true;
    }

    // Check additional requirements.
    let isContinueSignAvailable;
    try {
      isContinueSignAvailable = this.sandbox.evalWithArgs(isContinueSignAvailableFunction, [document, user, units], {
        meta: { fn: 'isContinueSignAvailable', documentId },
      });
      log.save('continue-sign-available-function-result', { documentId, isContinueSignAvailableFunction, isContinueSignAvailable });
    } catch (error) {
      log.save(
        'continue-sign-available-function-error',
        {
          documentId,
          isContinueSignAvailableFunction,
          error: error && error.message,
          document,
        },
        'error',
      );
      throw new Error('Continue sign available function error.', { cause: error });
    }

    // Return is sign available indicator.
    return isContinueSignAvailable;
  }

  /**
   * Find by ID and check acess.
   * @param {string} documentId Document ID.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   * @param {boolean} [strict] Strict indicator. Signers do not have access if equals `true`.
   * @param {boolean} [doNotCheckAccess] Do not check access.
   * @returns {Promise<DocumentEntity>} Document entity.
   */
  async findByIdAndCheckAccess(documentId, userId, userUnitIds, strict = false, doNotCheckAccess = false) {
    const document = await models.document.findById(documentId, false, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Append trace meta.
    this.appendTraceMeta({
      documentId,
      documentTemplateId: document.documentTemplateId,
      taskId: document.task && document.task.id,
      taskTemplateId: document.task && document.task.taskTemplateId,
      workflowId: document.task && document.task.workflowId,
    });

    // Check access.
    const hasAccess = document.task && (await document.task.hasAccess(userId, userUnitIds, strict));
    if (!hasAccess && !doNotCheckAccess) {
      // Check if strict.
      if (strict) {
        throw new ForbiddenError(ERROR_DOCUMENT_ACCESS);
      }

      // Check access by inbox.
      const hasAccessByInbox = await models.userInbox.getByUserIdAndDocumentId(userId, documentId);
      if (!hasAccessByInbox) {
        throw new ForbiddenError(ERROR_DOCUMENT_ACCESS);
      }
    }

    // Get and return document.
    const documentSignatures = await models.documentSignature.getByDocumentId(documentId);
    const documentSignatureRejections = await models.documentSignatureRejection.getByDocumentId(documentId);
    document.signatures = documentSignatures;
    document.signatureRejections = documentSignatureRejections;
    return document;
  }

  /**
   * Find by ID and check acess.
   * @param {string} workflowId Workflow ID.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   * @param {boolean} [strict] Strict indicator. Signers do not have access if equals `true`.
   * @returns {Promise<DocumentEntity>} Document entity.
   */
  async findByWorkflowIdAndCheckAccess(workflowId, taskTemplateId, userId, userUnitIds, strict = false) {
    // Get document by workflowId and taskTemplateId.
    const documentId = await models.task.findDocumentIdByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId);

    // Check access and get document.
    let document;
    try {
      document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, strict);
    } catch (error) {
      throw new Error(error.message, { cause: error });
    }
    return document;
  }

  /**
   * Update.
   * @param {string} documentId Document ID.
   * @param {{key, value, previousValue}[]} properties Properties as [{ someKey: 'someValue' }].
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   * @param {boolean} isFromSystemTask.
   * @param {boolean} [isKeepDocumentFile]
   * @returns {Promise<DocumentEntity>} Updated document entity promise.
   */
  async update(documentId, properties, userId, userUnitIds, isFromSystemTask, isKeepDocumentFile = false) {
    // Get document.
    const document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    if (document.isFinal === true) {
      throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
    }

    // Check if document has signers.
    const documentSignatures = await models.documentSignature.getByDocumentId(documentId);
    if (documentSignatures && documentSignatures.length > 0) {
      throw new Error('Can\'t update - document contains signatures.');
    }

    // Get JSON schema.
    const templateId = document.documentTemplateId;
    const template = await models.documentTemplate.findById(templateId);
    if (!template) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const jsonSchema = template.jsonSchema;

    // Remove readonly params.
    const documentValidator = new DocumentValidator(jsonSchema);
    const existingDocumentData = document.data;
    let documentDataObject = existingDocumentData || EMPTY_DOCUMENT_DATA;
    const propertiesWithoutReadonlyParams = await documentValidator.removeReadonlyParams(properties, documentDataObject, isFromSystemTask);

    // Check array elements added or removed.
    this.checkArrayElements(propertiesWithoutReadonlyParams, document, jsonSchema);

    // Update.
    let arrayPaths = [];
    propertiesWithoutReadonlyParams.forEach((property) => {
      // Ensure arrays are present in the path
      this.ensureArraysInPath(documentDataObject, property.path);

      // Set new value.
      if (typeof property.value === 'undefined') {
        PropByPath.delete(documentDataObject, property.path);
      } else {
        PropByPath.set(documentDataObject, property.path, property.value);
      }

      // Remove empty array fields if need it.
      const propertyParentPath = property.path.split('.').slice(0, -1).join('.');
      if (propertyParentPath) {
        const propertyParentValue = PropByPath.get(documentDataObject, propertyParentPath);
        if (Array.isArray(propertyParentValue)) {
          arrayPaths.push(propertyParentPath);
        }
      }
    });

    // Remove arrays empty fields.
    arrayPaths = [...new Set(arrayPaths)];
    arrayPaths.forEach((arrayPath) => {
      const arrayElement = PropByPath.get(documentDataObject, arrayPath);
      const arrayElementWithoutEmptyRecords = arrayElement.filter((v) => typeof v !== 'undefined' && v !== null);
      PropByPath.set(documentDataObject, arrayPath, arrayElementWithoutEmptyRecords);
    });

    const registerControlPaths = this.getRegisterControlPath(properties, jsonSchema);
    if (registerControlPaths.length > 0) {
      await this.checkUpdateRegisterProperties(registerControlPaths, jsonSchema, documentDataObject);
    }

    // Update document.
    const documentUpdated = await models.document.updateData(documentId, userId, documentDataObject, true, isKeepDocumentFile);
    if (!documentUpdated) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    // Calculate draftExpiredAt and update task if need.
    const taskToReCalculateDraftExpiredAt = {
      ...document.task,
      taskTemplate: undefined,
      document: { ...documentUpdated, task: undefined },
    };
    await global.businesses.task.calculateAndUpdateDraftExpiredAt(taskToReCalculateDraftExpiredAt, document.task.taskTemplate.jsonSchema, true);

    return documentUpdated;
  }

  /**
   * Check array elements.
   * Throw error if not allowed.
   * @param {{path, value}[]} properties Properties.
   * @param {object} document Document.
   * @param {object} jsonSchema JSON schems.
   */
  checkArrayElements(properties, document, jsonSchema) {
    // Check array elements added or removed.
    // Add cases:
    // 1.1: `{"properties":[{"path":"arraysStep","value":{"arrayProperty1":[{}]}}]}`
    // 1.2: `{"properties":[{"path":"arraysStep.arrayProperty1.1","value":{}}]}`
    // Remove cases:
    // 2.1: `{"properties":[..., {"path":"arraysStep.arrayProperty2.1","previousValue":{"firstName":"saxasx","lastName":"asxasx"}}]}`
    // 2.2: `{"properties":[{"path":"arraysStep.arrayProperty2.0","previousValue":{"firstName":"saxasx","lastName":"asxasx"}}]}`
    for (const property of properties) {
      // Check array.
      const arrayPath = property.path.match(/\.\d{1,}$/) && property.path.split('.').slice(0, -1).join('.');
      if (!arrayPath) {
        continue;
      }

      // Define added indicator (removed in other case).
      const isArrayElementAdded = !!property.value;
      const arraySchemaPath = `properties.${arrayPath.split('.').join('.properties.')}`;
      const arraySchema = PropByPath.get(jsonSchema, arraySchemaPath) || {};
      const { allowAdd: allowAddBoolOrFunction = true, allowDelete: allowDeleteBoolOrFunction = true } = arraySchema;
      const propertyData = property.value;
      const pageObject = document.data[property.path.split('.')[0]];
      const documentData = document.data;
      const allowAdd =
        typeof allowAddBoolOrFunction === 'string'
          ? this.sandbox.evalWithArgs(allowAddBoolOrFunction, [propertyData, pageObject, documentData], {
            meta: { fn: 'allowAdd', documentId: document.id },
          })
          : !!allowAddBoolOrFunction;
      const allowDelete =
        typeof allowDeleteBoolOrFunction === 'string'
          ? this.sandbox.evalWithArgs(allowDeleteBoolOrFunction, [propertyData, pageObject, documentData], {
            meta: { fn: 'allowDelete', documentId: document.id },
          })
          : !!allowDeleteBoolOrFunction;

      // Chech operation allowed by schema.
      if (isArrayElementAdded && !allowAdd) {
        throw new Error(`Can not add array element according to JSON schema rules. Array path: "${arrayPath}".`);
      }
      if (!isArrayElementAdded && !allowDelete) {
        throw new Error(`Can not remove array element according to JSON schema rules. Array path: "${arrayPath}".`);
      }
    }
  }

  /**
   * Ensure arrays in path.
   * @param {object} object Object.
   * @param {string} path Path.
   */
  ensureArraysInPath(object, path) {
    const pathArray = path.split('.');
    let currentPosition = object;

    for (let i = 0; i < pathArray.length - 1; i++) {
      let key = pathArray[i];
      let nextKey = pathArray[i + 1];

      // If currentPosition[key] is an object, then nextKey is object key, represented as number.
      // Ex. multisign.signature.0.161011 (161011 is object key).
      // Ex. multisign.headsignature.111111 (111111 is object key).
      const isNextKeyObjectKey = typeof currentPosition[key] === 'object';

      // Determine if the current key should map to an object or array.
      const shouldBeObject = key === 'propertiesHasOptions' || !!currentPosition[key]?.propertiesHasOptions;
      const isNextKeyNumeric = !isNaN(nextKey);

      if (isNextKeyNumeric && !isNextKeyObjectKey && !shouldBeObject) {
        if (!Array.isArray(currentPosition[key])) {
          // Ensure currentPosition[key] is an array
          currentPosition[key] = [];
        }
      } else {
        // Ensure currentPosition[key] is an object
        if (typeof currentPosition[key] !== 'object' || currentPosition[key] === null) {
          currentPosition[key] = {};
        }
      }

      // Move to the next level.
      currentPosition = currentPosition[key];
    }
  }

  /**
   * Update by external service.
   */
  async updateByExternalService(documentId, documentDataObject, externalServiceUser, doNotCheckAccess = false) {
    // Get document.
    const document = await this.findByIdAndCheckAccess(documentId, externalServiceUser, undefined, undefined, doNotCheckAccess);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Check document is final.
    if (document.isFinal === true) {
      log.save('update-by-external-service|document-already-committed-error', { documentId, externalServiceUser });
      throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
    }

    // Update document.
    const documentUpdated = await models.document.updateData(documentId, externalServiceUser, documentDataObject);
    if (!documentUpdated) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }

    // Return updated document.
    return documentUpdated;
  }

  /**
   * Prepare.
   * @param {string} documentId Document ID.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   * @returns {Promise<boolean>}
   */
  async prepare(documentId, userId, userUnitIds) {
    // Get document.
    const document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    if (document.isFinal === true) {
      throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
    }

    // Get all values by key name 'id'
    const flatData = flattening(document.data);
    const allIds = Object.keys(flatData)
      .map((key) => key.match(/\bid$/) && flatData[key])
      .filter(Boolean);

    const attachments = await this.documentAttachmentModel.getByDocumentId(documentId);

    // Get all missing id in all document's data ids
    const missingIds = attachments
      .filter((v) => !v.isGenerated && !v.isSystem) // Remove hidden attachments
      .map(({ id }) => id)
      .filter((id) => !allIds.includes(id));

    // Remove missing attachment
    for (const missingId of missingIds) {
      log.save('prepare-document-remove-attachment', { attachmentId: missingId });
      await businesses.document.deleteAttachment(documentId, missingId, userId);
    }
  }

  /**
   * Validate.
   * @param {string} documentId Document ID.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   * @param {boolean} includesUnexpectedErrors Includes unexpected errors.
   * @returns {Promise<boolean>}
   */
  async validate(documentId, userInfo, userUnitIds, includesUnexpectedErrors) {
    // Get document.
    const document = await this.findByIdAndCheckAccess(documentId, userInfo.userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Get JSON schema.
    const templateId = document.documentTemplateId;
    const template = await models.documentTemplate.findById(templateId);
    if (!template) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const jsonSchema = template.jsonSchema;

    // Validate document.
    const documentValidator = new DocumentValidator(
      jsonSchema,
      {
        getFilteredRecordsByKeyId: businesses.register.getFilteredRecordsByKeyId.bind(businesses.register),
        getFilteredRecordsByKeyIdArguments: {
          userUnitIds: userUnitIds,
        },
      },
      userInfo,
    );
    const validationErrors = await documentValidator.check(document.data, includesUnexpectedErrors);
    if (validationErrors.length > 0) {
      const error = new Error('Validation error.', { details: validationErrors });
      error.details = validationErrors;
      throw error;
    }

    return true;
  }

  /**
   * Get attachment info.
   * @param {string} attachmentId Attachment ID.
   * @param {string} userId User ID.
   * @returns {Promise<object>} Attachment info promise.
   */
  async getAttachmentInfo(attachmentId) {
    // Return attachment info.
    const attachmentInfo = await models.documentAttachment.findById(attachmentId);
    if (!attachmentInfo) {
      throw new NotFoundError('Attachment not found.');
    }
    return attachmentInfo;
  }

  /**
   * Get attachment file link.
   * @param {string} documentId Document ID.
   * @param {string} attachmentId Attachment ID.
   * @param {boolean} [withName] With name.
   * @returns {Promise<{fileLink, fileName}>|Promise<string>} Attachment file link promise.
   */
  async getAttachmentFileLink(documentId, attachmentId, withName = false) {
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
   * @param {string} documentId Document ID.
   * @returns {Promise<string[]>} Attachment files links promise.
   */
  async getAttachmentFilesLinks(documentId) {
    // Get document attachments.
    const attachments = await models.documentAttachment.getByDocumentId(documentId);
    if (!attachments) {
      throw new ForbiddenError(ERROR_DOCUMENT_ACCESS);
    }

    // Define and return attachments links.
    const attachmentsLinks = attachments.map((v) => v.link);
    return attachmentsLinks;
  }

  /**
   * Get attachment.
   * @param {string} documentId Document ID.
   * @param {string} attachmentId Attachment ID.
   * @param {string} userId User ID.
   * @returns {Promise<ReadableStream>} Download file readable stream.
   */
  async getAttachment(documentId, attachmentId, userId) {
    // Get file link.
    const fileLink = await this.getAttachmentFileLink(documentId, attachmentId, userId);
    if (!fileLink) {
      throw new Error(ERROR_ATTACHMENT_FILE_NOT_FOUND);
    }

    // Get and return readable stream from file storage.
    const downloadFileReadableStream = await this.storageService.provider.downloadFile(fileLink);
    return downloadFileReadableStream;
  }

  /**
   * Delete attachment.
   * @param {string} documentId Document ID.
   * @param {string} attachmentId Attachment ID.
   * @param {string} userId User ID.
   * @returns {Promise<string>} File link.
   */
  async deleteAttachment(documentId, attachmentId, userId) {
    // Get file link.
    const fileLink = await this.getAttachmentFileLink(documentId, attachmentId, userId);

    // Delete attachment from DB.
    const deleted = await models.documentAttachment.delete(attachmentId);
    if (!deleted) {
      throw new Error('Can\'t delete attachment.');
    }

    // Return file link.
    return fileLink;
  }

  /**
   * Get files to preview.
   * @param {string} workflowId Workflow ID.
   * @param {number} documentTemplateId Document template ID.
   * @param {string} path Path. Samples: `userDocument`, `userDocument.filesFromPreviousDocument`.
   * @param {object} [task] Task.
   * @param {boolean} [isDirect] Is direct files indicator.
   * @param {boolean} [isNotOnlyCurrent] Only current tasks indicator.
   * @returns {Promise<{downloadToken, documentId, documentTemplateId, fileLink, isGenerated, taskPerformerUsers, taskPerformerUnits, taskRequiredPerformerUnits, taskObserverUnits, documentTemplateAccess}[]>} Promise of files info list.
   */
  async getFilesToPreview(workflowId, documentTemplateId, path, task, isDirect = false, isNotOnlyCurrent = false) {
    // Define step schema.
    const documentTemplate = await models.documentTemplate.findById(documentTemplateId);
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
    let documentTemplateIds = isDirect ? [filesDocumentTemplateId] : filesDocumentTemplateIds;

    // Define documents IDs from current workflow.
    let useFilterByTask = {};
    if (task && (task.finished === true || task.isCurrent === false)) {
      useFilterByTask = { onlyCurrent: false, maxCreatedAtTask: task.updatedAt };
    }

    // Define onlyCurrent task filter.
    if (isNotOnlyCurrent) {
      useFilterByTask = { onlyCurrent: false, isDistinct: true };
    }

    const taskIdsAndDocumentIds = await models.task.getTaskAndDocumentMainInfo(workflowId, useFilterByTask); // Format: `{ taskId, documentId, taskPerformerUsers, taskPerformerUnits, taskRequiredPerformerUnits, taskObserverUnits }[]`.
    let documentIds = taskIdsAndDocumentIds.map((v) => v.documentId).filter((v) => !!v);

    // Define all files info.
    const { includeMainFile = false, documentAttaches: documentAttachesFunctionString } = controlSchema || {};

    let directDocument;
    if (isDirect && documentAttachesFunctionString) {
      const { document } = (await models.task.findDocumentByWorkflowIdAndTaskTemplateIds(workflowId, [filesDocumentTemplateId])) || {};
      if (!document) {
        return [];
      }
      directDocument = document;
      directDocument.attachments = await models.documentAttachment.getByDocumentId(document.id);
    }

    let events = await models.event.getEventsByWorkflowId(workflowId);
    filesEventTemplateIds = [...new Set([...filesEventTemplateIds, ...events.map((v) => v.eventTemplateId)])];
    let eventsWithTemplates = [];
    if (Array.isArray(filesEventTemplateIds) && filesEventTemplateIds.length > 0) {
      const eventDocumentIds = events.filter((v) => v.documentId && filesEventTemplateIds.includes(v.eventTemplateId)).map((v) => v.documentId);

      documentIds = documentIds.concat(eventDocumentIds);
      documentTemplateIds.push(EVENT_FILE_DOCUMENT_TEMPLATE_ID);

      const eventsTemplates = await models.eventTemplate.findByIds(events.map((v) => v.eventTemplateId));
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
      documentAttachments = this.sandbox.evalWithArgs(documentAttachesFunctionString, [directDocument], {
        meta: { fn: 'documentAttaches', workflowId },
      });
    } else {
      documentAttachments = await models.documentAttachment.getByDocumentIds(documentIds);
    }

    const documentInfoWithFileNames = await models.document.getFilesNamesByIds(documentIds);

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

    const documentTemplates = await models.documentTemplate.getAccessJsonSchemasByIds(allFilesInfo.map((v) => v.documentTemplateId));

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
    for (let fileInfo of allFilesInfo) {
      // Generate and append download token.
      const { fileLink, eventTemplateAccess = {} } = fileInfo;
      const { workflowFiles = {} } = eventTemplateAccess;
      const { fileName: fileNameFunc } = workflowFiles;
      if (fileNameFunc) {
        if (!documents) {
          documents = await models.document.getByIds(documentIds);
        }
        try {
          fileInfo.fileName = this.sandbox.evalWithArgs(fileNameFunc, [documents], { checkArrow: true, meta: { fn: 'fileName', workflowId } });
        } catch (error) {
          log.save('file-name-generating-error', { error: error.message, fileNameFunc, documentIds, workflowId });
        }
      }
      fileInfo.downloadToken = this.downloadToken.generate(fileLink);
    }

    if (typeof filterFunction === 'string') {
      try {
        const f = this.sandbox.eval(filterFunction);
        allFilesInfo = allFilesInfo.filter(f);
      } catch (error) {
        log.save('filter-error', { error });
      }
    }

    return allFilesInfo;
  }

  /**
   * Get files to preview.
   * @param {string} documentId Document ID.
   * @param {string} stepOrPath Step name or path. Sample: "userDocument.documentPreview".
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs.
   * @param {boolean} [isDirect] Is direct files indicator.
   * @returns {Promise<{downloadToken, id, name, description, contentType, contentLength}[]>} Promise of files info list.
   */
  async getFilesToPreviewAndCheckAccess(documentId, stepOrPath, userId, userUnitIds, isDirect = false) {
    // Get document and check access.
    const document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds);

    // Define document template ID.
    const { documentTemplateId } = document;

    // Define workflow ID.
    const task = await models.task.findByDocumentId(documentId);
    const { workflowId } = task;

    // Get and return files to preview.
    const filesToPreview = await this.getFilesToPreview(workflowId, documentTemplateId, stepOrPath, task, isDirect);
    const documentIds = [...new Set(filesToPreview.map((v) => v.documentId).filter(Boolean))];

    const documentSignaturesPromises = documentIds.map((documentId) => models.documentSignature.getByDocumentId(documentId));
    const documentSignatures = await Promise.all(documentSignaturesPromises);
    const fileIds = filesToPreview.map((v) => v.fileLink);
    const p7sMetadata = await this.storageService.provider.getP7sMetadata(fileIds);

    let allSignaturesInfo = {};
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
              const signatureInfo = await this.eds.getSignatureInfo(signature);
              signaturesInfo.push(signatureInfo);
            } catch (error) {
              log.save('get-files-to-preview-and-check-access|get-signature-info-error', error.message);
            }
          }
        } else {
          if (signatures.length > 0) {
            try {
              const signatureInfo = await this.eds.getSignatureInfo(signatures[0]);
              signaturesInfo.push(signatureInfo);
            } catch (error) {
              log.save('get-files-to-preview-and-check-access|get-signature-info-error', error.message);
            }
          }
        }
        allSignaturesInfo[documentId] = signaturesInfo.reduce(
          (acc, curr) => (acc.find(({ serial }) => serial === curr.serial) ? acc : acc.concat(curr)),
          [],
        );
      } catch (error) {
        log.save('error', error.message);
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
        log.save('Can not get signature info', error);
      }
    }

    return filesToPreview;
  }

  /**
   * Calculate payment.
   * @param {string} documentId Document ID.
   * @param {string} payload Payload.
   * @param {string} userId User ID.
   * @param {string} userName User name.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs.
   * @returns {Promise<DocumentEntity>} Document entity.
   */
  async calculatePayment(documentId, payload, userId, userName, userUnitIds, userContactData, workflowId, taskTemplateId) {
    // Get document.
    const document = documentId
      ? await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true)
      : await this.getDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId);
    if (!document || !document.task) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    const { paymentControlPath, extraData } = payload;
    const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');

    // Get document template.
    const templateId = document.documentTemplateId;
    const documentTemplate = await models.documentTemplate.findById(templateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema } = documentTemplate;

    // Get provider options.
    const paymentProperties = PropByPath.get(jsonSchema && jsonSchema.properties, paymentControlPath);
    if (!paymentProperties) {
      throw new Error('Can not find payment properties in JSON schema.');
    }
    log.save('payment-properties', { documentTemplateId: documentTemplate.id, documentTemplateName: documentTemplate.name, paymentProperties });
    const paymentCustomer = paymentProperties && paymentProperties.customer;
    const paymentSystemParams = this.config.payment && this.config.payment[paymentCustomer];

    // Check if sum for test.
    const { sumForTest } = this.config.payment || {};

    // Check if previous payment status is handled.
    let documentDataObject = document.data;
    const controlPaymentData = PropByPath.get(documentDataObject, paymentDocumentPath);
    const calculatedData = controlPaymentData && controlPaymentData[CALCULATED_PAYMENT_PATH];

    if (calculatedData && calculatedData.transactionId) {
      const processedData = controlPaymentData && controlPaymentData[PROCESSED_PAYMENT_PATH];
      const lastProcessedPayment = processedData && processedData[processedData.length - 1];
      if (
        !processedData ||
        !processedData.length ||
        (lastProcessedPayment && lastProcessedPayment.transactionId && lastProcessedPayment.transactionId !== calculatedData.transactionId)
      ) {
        let statusInfo;
        let rewriteCalculatedData = false;
        try {
          statusInfo = await this.handlePaymentStatus(calculatedData, paymentCustomer, calculatedData.transactionId, undefined, undefined, true);
        } catch {
          rewriteCalculatedData = true;
        }
        if (!rewriteCalculatedData && statusInfo && statusInfo.transactionId === calculatedData.transactionId) {
          const documentWithPrevState = await models.document.findById(documentId);
          if (!documentWithPrevState) {
            log.save('get-document-with-payment-status-error', { documentWithPrevState }, 'error');
            throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
          }
          if (statusInfo.status && statusInfo.status.isSuccess) return documentWithPrevState;
          documentDataObject = documentWithPrevState.data;
        }
      }
    }

    const paymentData = await this.paymentService.calculatePayment({
      paymentSystemParams,
      document,
      documentTemplate,
      paymentControlPath,
      jsonSchema,
      paymentCustomer,
      extraData,
      userName,
      paymentDocumentPath,
      userContactData,
      sumForTest,
      paymentProperties,
    });
    if (!paymentData) {
      throw new Error(ERROR_GET_PAYMENT_DATA);
    }
    log.save('get-payment-data', { paymentData });

    // Update document with payment data.
    if (!controlPaymentData) PropByPath.set(documentDataObject, paymentDocumentPath, {});
    PropByPath.set(documentDataObject, `${paymentDocumentPath}.${CALCULATED_PAYMENT_PATH}`, paymentData);

    let calculatedPaymentHistory = PropByPath.get(documentDataObject, `${paymentDocumentPath}.${CALCULATED_PAYMENT_HISTORY_PATH}`);
    if (!Array.isArray(calculatedPaymentHistory)) calculatedPaymentHistory = [];
    calculatedPaymentHistory.push(paymentData);
    PropByPath.set(documentDataObject, `${paymentDocumentPath}.${CALCULATED_PAYMENT_HISTORY_PATH}`, calculatedPaymentHistory);

    const updatedDocument = await models.document.updateData(documentId || document.id, userId, documentDataObject);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    log.save('update-document-with-payment-data', { updatedDocument });

    // Return document.
    return updatedDocument;
  }

  /**
   * Handle payment status.
   * @param {string} payload Payload.
   * @param {string} paymentCustomer Payment customer.
   * @param {string} status Status.
   * @param {object} queryParamsObject Query params object.
   * @param {object} headersObject Headers object.
   * @param {boolean} checkPrevTransaction Check prev transaction indicator.
   * @returns {Promise<DocumentEntity>} Document entity.
   */
  async handlePaymentStatus(payload, paymentCustomer, status, queryParamsObject, headersObject, checkPrevTransaction = false) {
    // Get provider options.
    log.save('external-services-payment-status-business-payload', payload);
    const providerOptions = this.config && this.config.payment && this.config.payment[paymentCustomer];
    log.save('get-provider-options-to-handle-payment-status', { ...providerOptions, rsaPrivateKeyInBase64: '****', rsaPublicKeyInBase64: '****' });

    // Get status info.
    const statusInfo = await this.paymentService.handleStatus(
      payload,
      providerOptions,
      status,
      queryParamsObject,
      headersObject,
      checkPrevTransaction,
    );
    if (!statusInfo) {
      throw new NotFoundError('Can\'t get payment status.');
    }
    log.save('get-payment-status-info-from-payment-provider', { statusInfo });

    // Get document by user or by external service.
    const { documentId, paymentControlPath, extraData, transactionId } = statusInfo;
    const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');

    let document = await models.document.findById(documentId);
    if (!document || !document.task) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    log.save('get-document-to-handle-payment-status', {
      document: { ...document, data: HIDE_REPLACEMENT_TEXT, documentTemplate: HIDE_REPLACEMENT_TEXT },
    }); // Do not log large document.data and document.documentTemplate.

    // Append trace meta.
    this.appendTraceMeta({ workflowId: document.task?.workflowId });

    let documentDataObject = document.data;
    let controlPaymentData = documentDataObject && PropByPath.get(documentDataObject, paymentDocumentPath);
    const { task } = document;
    const { createdBy } = task;

    log.save('control-payment-data', { documentId: document.id, taskId: task.id, controlPaymentData });

    // Store payment document path if hold success payment.
    if (statusInfo.status && statusInfo.status.isSuccess) {
      const calcPaymentHistory = controlPaymentData[CALCULATED_PAYMENT_HISTORY_PATH];
      const calcPaymentInfo = calcPaymentHistory.find((v) => v.transactionId === transactionId);
      const isHold = calcPaymentInfo && calcPaymentInfo.extraData && calcPaymentInfo.extraData.isHold;
      if (isHold) {
        const metaDocPayment = { paymentControlPath, isHoldPayment: isHold };
        businesses.task.addTaskMetadata(task, createdBy, false, metaDocPayment);
      }
    }

    // Check if duplicated success payment status.
    const isExistSuccessStatusWithTheSameTransactionId =
      Array.isArray(controlPaymentData[PROCESSED_PAYMENT_PATH]) &&
      controlPaymentData[PROCESSED_PAYMENT_PATH].some((v) => v && v.transactionId === transactionId && v.status && v.status.isSuccess);

    // Update document, add payment status.
    if (!Array.isArray(controlPaymentData && controlPaymentData[PROCESSED_PAYMENT_PATH])) {
      PropByPath.set(documentDataObject, `${paymentDocumentPath}.${PROCESSED_PAYMENT_PATH}`, []);
    }
    controlPaymentData[PROCESSED_PAYMENT_PATH].push(statusInfo);

    const updatedDocument = await models.document.updateData(documentId, undefined, documentDataObject);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    log.save('updated-document-with-payment-status', { documentId, controlPaymentData });

    // Get payment schema control template.
    const template = await models.documentTemplate.findById(document.documentTemplateId);
    if (!template) {
      log.save('handle-payment-status-not-found-document-template-error', { templateId: document.documentTemplateId, documentId, taskId: task.id });
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const paymentSchemaControl = PropByPath.get(template.jsonSchema.properties, paymentControlPath) || {};

    // Check schema handlers.
    if (paymentSchemaControl.onReceiveStatusHandlers?.length) {
      if (
        typeOf(paymentSchemaControl.onReceiveStatusHandlers) !== 'array' ||
        !paymentSchemaControl.onReceiveStatusHandlers.every((v) => typeOf(v) === 'object')
      ) {
        throw new InvalidSchemaError('paymentSchemaControl.onReceiveStatusHandlers should be an array of objects.');
      }

      for (const handler of paymentSchemaControl.onReceiveStatusHandlers) {
        if (handler.type === 'register.update-one-record') {
          try {
            await this.updateOneRegisterRecord(handler, document, statusInfo);
          } catch (error) {
            throw new Error(`${paymentControlPath}.onReceiveStatusHandlers.register.update-one-record. Cannot update record. ${error.toString()}`, { cause: error });
          }
        }
      }
    }

    // Download receipt to file storage.
    if (statusInfo.status && statusInfo.status.isSuccess && !isExistSuccessStatusWithTheSameTransactionId) {
      const {
        extraData: { order_id: orderId },
      } = statusInfo;

      if (paymentSchemaControl.isDownloadReceipt) {
        // Do not wait this operation. We can download it later in Event.
        this.tryToDownloadPaymentReceiptFiles({ document, providerOptions, orderId, paymentSchemaControl });
      }
    }

    // Check if need to autocommit task.
    if (statusInfo.status && statusInfo.status.isSuccess) {
      // Get json schema.
      const { id: taskId } = task;
      const jsonSchema = template.jsonSchema;

      // Check valid.
      const documentValidator = new DocumentValidator(jsonSchema);
      const validationErrors = await documentValidator.check(document.data);
      if (validationErrors.length > 0) {
        // If has validation error - do not commit.
        const workflowError = {
          error: 'Validation error when try commit after payment.',
          details: validationErrors,
          queueMessage: { workflowId: task.workflowId },
        };
        await models.workflowError.create(workflowError);
      } else {
        // If no validation error - commit.
        // Check commitAfterPayment flag in schema.
        const { commitAfterPayment } = paymentSchemaControl || {};
        if (commitAfterPayment && !document.isFinal) {
          const finishedTask = await models.task.setStatusFinished(taskId);
          await models.document.setStatusFinal(documentId);

          // Handle activity.
          await businesses.task.handleActivityTypeEvents(task, 'TASK_COMMITTED');
          if (global.config.activity_log?.isEnabled) {
            const activity = new TaskActivity({
              type: 'TASK_COMMITTED',
              details: {
                commitType: 'BY_EXTERNAL_SYSTEM',
                systemName: providerOptions.providerName,
              },
            });
            await models.task.appendActivityLog(task.id, activity);
          }

          // Set the workflow status.
          const { workflowId, taskTemplateId } = finishedTask;
          const { workflowTemplate } = await models.workflow.findById(workflowId);
          const documents = await models.task.getDocumentsByWorkflowId(workflowId);
          const events = await models.event.getEventsByWorkflowId(workflowId);
          try {
            await businesses.workflow.setWorkflowStatus(workflowId, workflowTemplate, parseInt(taskTemplateId), { documents, events });
          } catch (error) {
            log.save('set-workflow-status-error', { workflowId, error: error.message });
            await models.workflowError.create(
              {
                error: 'Can not set the workflow status.',
                details: {
                  message: error.message,
                },
                traceMeta: {
                  workflowId,
                  taskId,
                  taskTemplateId,
                },
                queueMessage: {},
              },
              'warning',
            );
          }

          // Send message to RabbitMQ.
          const message = { workflowId: finishedTask.workflowId, taskId: taskId };
          global.messageQueue.produce(message);
        }
      }
    }

    // Redirect or response.
    const { redirectUrl } = extraData;
    if (statusInfo.extraData && statusInfo.extraData.checkPrevPayment) return statusInfo;
    return providerOptions.doRedirect
      ? { url: redirectUrl, ...statusInfo }
      : providerOptions.notifyUrlShortResponse
        ? { isAccepted: true }
        : statusInfo;
  }

  /**
   * Confirm payment by sms code.
   * @param {string} smsCode Sms code.
   */
  async confirmBySmsCode(smsCode, paymentCustomer, paymentControlPath, documentId, userId, userUnitIds) {
    // Get document.
    const document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Get payment options.
    const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');
    const providerOptions = this.config && this.config.payment && this.config.payment[paymentCustomer];

    // Calculated payment data.
    const documentDataObject = document.data;
    const controlPaymentData = PropByPath.get(documentDataObject, paymentDocumentPath);
    const calculatedData = controlPaymentData && controlPaymentData[CALCULATED_PAYMENT_PATH];
    if (!calculatedData) {
      throw new Error('Can not handle confirm code, calculated payment data does not exist.');
    }
    const { transactionId } = calculatedData;

    // Send confirmation code.
    let confirmCodeRes = 0;
    let paymentId = undefined;
    try {
      await this.paymentService.confirmBySmsCode(providerOptions, calculatedData, smsCode);
    } catch (error) {
      log.save('confirm-code-response-error', { error }, 'error');
    }

    // Add payment status.
    const confirmCodeResObj = { isCodeConfirmed: confirmCodeRes, transactionId, paymentId: paymentId };

    // Get document again, in case there are changes about payment status.
    const documentNewVersion = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!documentNewVersion) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    const documentDataObjectUpdated = documentNewVersion.data;
    PropByPath.set(documentDataObjectUpdated, `${paymentDocumentPath}.${CONFIRM_CODE_INFO_PATH}`, confirmCodeResObj);

    // Update document.
    const updatedDocument = await models.document.updateData(documentId, undefined, documentDataObjectUpdated);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    log.save('updated-document-with-payment-status', { updatedDocument });

    return { isConfirmed: confirmCodeRes, transactionId };
  }

  /**
   * Cancel order.
   * @param {string} paymentCustomer config field
   * @param {string} orderId portal data
   * @param {string} transactionId Transaction ID
   * @param {string} sessionId Payment session ID
   */
  async cancelOrder(paymentCustomer, orderId, transactionId, sessionId) {
    try {
      const providerOptions = this.config && this.config.payment && this.config.payment[paymentCustomer];

      return await this.paymentService.cancelOrder(providerOptions, orderId, transactionId, sessionId);
    } catch (error) {
      log.save('cancel-order-payment-document-error', { error: error && error.message }, 'error');
      throw error;
    }
  }

  /**
   * Unhold payment.
   * @param {string} documentId Document ID.
   * @param {string} taskMeta Task meta.
   * @param {object} jsonSchema JSON schema.
   * @param {string} userId User ID.
   */
  async unholdPayment(document, taskMeta, jsonSchema, userId) {
    const { paymentControlPath } = taskMeta;
    const documentData = document.data;
    const documentId = document.id;

    const paymentProperties = PropByPath.get(jsonSchema && jsonSchema.properties, paymentControlPath);
    if (!paymentProperties) {
      throw new Error('Can not find payment properties in JSON schema.');
    }

    const paymentCustomer = paymentProperties && paymentProperties.customer;
    const paymentSystemParams = this.config.payment && this.config.payment[paymentCustomer];
    const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');

    const documentPaymentData = PropByPath.get(documentData, paymentDocumentPath);
    const processedPaymentArray = documentPaymentData[PROCESSED_PAYMENT_PATH];
    if (!processedPaymentArray) {
      throw new Error('Can not find processed payment data.');
    }

    const calcPaymentHistory = documentPaymentData[CALCULATED_PAYMENT_HISTORY_PATH];
    const paidOrder = processedPaymentArray.find((v) => v.status && v.status.isSuccess);
    const paidTransactionId = paidOrder && paidOrder.transactionId;
    const paidPaymentInfo = calcPaymentHistory.find((v) => v.transactionId === paidTransactionId);
    const sessionId = paidPaymentInfo && paidPaymentInfo.extraData && paidPaymentInfo.extraData.sessionId;

    // OR transaction Id when failed payment.
    const providerTransactionId = paidOrder && paidOrder.extraData && (paidOrder.extraData.paymentId || paidOrder.extraData.externalTransactionId);
    log.save('prepare-params-to-unhold-payment', { paymentOptions: paymentSystemParams, transactionId: providerTransactionId, sessionId }, 'info');

    let unholdPaymentRes;
    try {
      unholdPaymentRes = await this.paymentService.unHoldPayment({
        paymentOptions: paymentSystemParams,
        transactionId: providerTransactionId,
        sessionId,
      });
    } catch (error) {
      log.save('unhold-payment-while-commit-error', error, 'error');
      throw new Error(error.message, { cause: error });
    }
    if (!unholdPaymentRes) {
      log.save('unhold-payment-empty-res-while-commit-error', { unholdPaymentRes, documentId }, 'error');
      throw new Error('Unhold payment result is empty.');
    }

    PropByPath.set(documentData, `${paymentDocumentPath}.${UNHOLD_PAYMENT_PATH}`, {
      ...unholdPaymentRes,
      paymentId: providerTransactionId,
      sessionId,
      transactionId: paidTransactionId,
    });

    // Update document.
    const updatedDocument = await models.document.updateData(documentId, userId, documentData);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    log.save('update-document-with-payment-data', { updatedDocument });

    return;
  }

  /**
   * Get document by workflow Id and task template Id
   * @param workflowId Workflow ID.
   * @param taskTemplateId Task template ID.
   * @returns {Promise<DocumentEntity>} Document entity.
   */
  async getDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId) {
    // Define task and document entities.
    let taskAndDocumentEntities;
    try {
      taskAndDocumentEntities = await models.task.findDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId);
    } catch (error) {
      throw new Error(error.message || String(error), { cause: error });
    }
    if (!taskAndDocumentEntities) {
      throw new Error('Can\'t find task or document entities.');
    }
    const { document } = taskAndDocumentEntities;

    return document;
  }

  /**
   * Decline multisigners.
   * @param {[string]} signers Signers ids.
   * @param {string} documentId Document Id.
   * @param {string} userId User Id.
   * @returns {boolean} isDeclined.
   */
  async declineMultisigns(signers, taskId, documentId, userId) {
    // Get document.
    const document = await models.document.findById(documentId);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    const documentSignatures = await models.documentSignature.getByDocumentId(documentId);
    const documentSignatureRejections = await models.documentSignatureRejection.getByDocumentId(documentId);
    document.signatures = documentSignatures;
    document.signatureRejections = documentSignatureRejections;
    const { documentTemplateId } = document;

    // Prepare letter to signers.
    let multisignerControl;
    try {
      multisignerControl = await this.getMultisignerControl(documentTemplateId);
    } catch (error) {
      log.save('decline-multisigns-get-multisigner-control-error', error, 'error');
      throw error;
    }
    if (!multisignerControl) {
      throw new Error('Can\'t find multisigner control.');
    }

    // Get signers data.
    let signersData;
    const privateProps = true;
    try {
      signersData = await this.auth.getUsersByIds(signers, privateProps);
    } catch (error) {
      log.save('decline-multisigns-get-users-info-error', error, 'error');
      throw new Error(error.message, { cause: error });
    }

    const rejectSignLetterTemplateFormula = multisignerControl.rejectSignLetterTemplate;
    const rejectSignTitleFormula = multisignerControl.rejectSignLetterTitle;
    if (!rejectSignLetterTemplateFormula || !rejectSignTitleFormula) {
      throw new Error('Can not find sign rejection letter data.');
    }

    const dataForMail = signersData.map((v) => {
      const template =
        typeof rejectSignLetterTemplateFormula === 'string' &&
        this.sandbox.evalWithArgs(rejectSignLetterTemplateFormula, [document, v.firstName, v.lastName, v.middleName, v.ipn, v.email, userId], {
          checkArrow: true,
          meta: { fn: 'rejectSignLetterTemplate', documentId },
        });

      const title =
        typeof rejectSignTitleFormula === 'string' &&
        this.sandbox.evalWithArgs(rejectSignTitleFormula, [document], { checkArrow: true, meta: { fn: 'rejectSignLetterTitle', documentId } });

      return {
        userId: v.userId,
        email: v.email,
        template,
        title,
      };
    });

    // Send letter by user Ids.
    const sendLetterByUserIdsPromises = dataForMail.map((v) => this.notifier.sendToUser(v.userId, v.title, v.template));
    Promise.all(sendLetterByUserIdsPromises).catch((error) => {
      log.save('send-emails-to-signers-error', { error }, 'error');
      throw error;
    });
  }

  /**
   * Get mutlisigners control
   * @param {string} templateId Template ID.
   */
  async getMultisignerControl(templateId) {
    // Get document JSON schema.
    const template = await models.documentTemplate.findById(templateId);
    if (!template) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const jsonSchema = template.jsonSchema;

    const controlName = this.config.multisigners && this.config.multisigners.schemaControl;
    // Find signers control.
    const multisignerControlArray = JSONPath(`$..[?(@.control === '${controlName}')]`, jsonSchema);
    if (!multisignerControlArray || multisignerControlArray.length > 1) {
      throw new Error('Can\'t find signers control.');
    }

    return multisignerControlArray[0];
  }

  /**
   * Get register readonly params.
   * @param {object} properties Properties.
   * @param {object} jsonSchema json schema.
   */
  getRegisterControlPath(properties, jsonSchema) {
    const propertiesWithJsonSchemaPaths = properties.map((property) => ({
      path: property.path,
      value: property.value,
      jsonSchemaPath: Paths.getJsonSchemaPath(property.path),
    }));
    const controlRegisterPathArray = [];

    for (const property of propertiesWithJsonSchemaPaths) {
      // Do not check if property value not exist.
      if (!property.value) {
        continue;
      }

      const jsonSchemaParts = property.jsonSchemaPath.split('.');
      let currentJsonSchemaPath = '';
      for (const jsonSchemaPartsItem of jsonSchemaParts) {
        // Prepare current JSON schema.
        currentJsonSchemaPath += `.${jsonSchemaPartsItem}`;

        // We must support actuality of existing controls that use register.
        const possibleRegisterControls = ['register', 'register.select', 'registry.search'];

        const currentControl = PropByPath.get(jsonSchema, `${currentJsonSchemaPath}.control`);
        if (possibleRegisterControls.includes(currentControl)) {
          controlRegisterPathArray.push(currentJsonSchemaPath);
        }
      }
    }
    return [...new Set(controlRegisterPathArray)];
  }

  /**
   * Check update register properties.
   * @param {[object]} properties Document properties with controller register.
   * @param {object} jsonSchema JSON schema.
   * @param {object} documentDataObject Document data.
   */
  async checkUpdateRegisterProperties(properties, jsonSchema, documentDataObject) {
    for (const property of properties) {
      const jsonSchemaValue = PropByPath.get(jsonSchema, property);
      const documentProperty = property.replace(/.properties./g, '.');
      let documentValue = PropByPath.get(documentDataObject, documentProperty);

      // Continue if we need to skip the register check.
      if (jsonSchemaValue && jsonSchemaValue.doNotRegisterCheck) {
        continue;
      }

      if (!documentValue || documentValue.length === 0 || Object.keys(documentValue).length === 0) {
        continue;
      }

      if (jsonSchemaValue.properties) {
        let documentRegisterData = [];
        for (let prop in jsonSchemaValue.properties) {
          if (documentValue[prop]) documentRegisterData.push(documentValue[prop]);
        }

        if (documentRegisterData.length === 0) {
          continue;
        }
        for (const data of documentRegisterData) {
          if (Array.isArray(data)) {
            for (const element of data) {
              const { id } = element;
              await this.compareWithRegisterRecordData(id, element);
            }
            continue;
          }
          const { id } = data;
          await this.compareWithRegisterRecordData(id, data);
        }
        continue;
      }

      // Process case documentValue is an array or records from register
      if (Array.isArray(documentValue)) {
        for (const recordDataInDocument of documentValue) {
          await this.compareWithRegisterRecordData(recordDataInDocument?.id, recordDataInDocument);
        }
      }

      // Process case documentValue is an object - record from register
      if (documentValue.id) {
        await this.compareWithRegisterRecordData(documentValue?.id, documentValue);
      }
    }

    return;
  }

  /**
   * @private
   * Compare with register record data.
   * @param {string} recordId record Id.
   * @param {object} documentValue Document value.
   */
  async compareWithRegisterRecordData(recordId, documentValue) {
    // Do request to register.
    let record, key;
    try {
      record = await this.registerService.findRecordById(recordId);
      key = await this.registerService.findKeyById(record?.keyId);
    } catch (error) {
      log.save('check-update-register-properties-get-register-record-by-id-error', error, 'error');
      let errorToResponse = new Error('Try to update register properties with unknown data. Record by ID not found.');
      errorToResponse.details = { recordId, documentValue };
      throw errorToResponse;
    }
    let recordData = record && record.data;
    const { toString } = key;

    // Add to record data fields that adds frontend.
    const toStringResult = this.sandbox.evalWithArgs(toString, [record], { meta: { fn: 'toString', recordId } });
    const stringifiedFrontFields = ['stringified', 'label'];
    if (documentValue.name && !recordData.name) {
      stringifiedFrontFields.push('name');
    }

    stringifiedFrontFields.forEach((filed) => {
      recordData[filed] = toStringResult;
    });

    delete recordData.id;

    for (const prop in recordData) {
      if (recordData[prop] !== documentValue[prop] && documentValue[prop] !== undefined) {
        if (Array.isArray(recordData[prop]) && Array.isArray(documentValue[prop])) {
          if (_.isEqual(_.sortBy(recordData[prop]), _.sortBy(documentValue[prop]))) continue;
        }
        if (typeof recordData[prop] === 'object' && typeof documentValue[prop] === 'object') {
          if (_.isEqual(recordData[prop], documentValue[prop])) continue;
          let notCheckedSubProps = false;
          for (const subProp in recordData[prop]) {
            if (recordData[prop][subProp] === '' && documentValue[prop][subProp] == undefined) {
              notCheckedSubProps = true;
              break;
            }
          }
          if (notCheckedSubProps) continue;
        }

        // Rewrite undefined value as 'undefined' for logging.
        if (typeof recordData[prop] === 'object' && typeof documentValue[prop] === 'object') {
          for (const [key, value] of Object.entries(documentValue[prop])) {
            if (value === undefined) {
              documentValue[prop][key] = 'undefined';
            } else {
              documentValue[prop][key] = value;
            }
          }
        }

        log.save('document-update|incorrect-register-record', {
          recordId,
          prop,
          recordDataProp: recordData[prop],
          documentValueProp: documentValue[prop],
        });
        let errorToResponse = new Error('Try to update register properties with unknown data.');
        errorToResponse.details = { recordId, prop, recordDataProp: recordData[prop], documentValueProp: documentValue[prop] };
        throw errorToResponse;
      }
    }

    return;
  }

  /**
   * @param {TaskEntity} task
   * @param {DocumentEntity} document
   * @return {Promise<string|void>}
   */
  async checkSignersOrderAndGetNextSigner({ task, document }) {
    const multiSignControl = await this.getMultisignerControl(document.documentTemplateId);
    if (!multiSignControl?.isKeepSignersOrder) {
      return; // Skip, there is no strict multi sign functionality.
    }

    let isKeepSignersOrder;
    try {
      isKeepSignersOrder =
        typeOf(multiSignControl.isKeepSignersOrder) === 'boolean'
          ? multiSignControl.isKeepSignersOrder
          : this.sandbox.evalWithArgs(multiSignControl.isKeepSignersOrder, [{ document }], { checkArrow: true });
    } catch (error) {
      throw new Error(`checkSignersOrderAndGetNextSigner. Evaluate multiSignControl.isKeepSignersOrder error. ${error?.toString()}`, { cause: error });
    }

    if (!isKeepSignersOrder) {
      return; // Skip, strict sequential sign rule disabled.
    }

    const signatures = await models.documentSignature.getByDocumentId(document.id, undefined, ['created_by'], [['created_at', 'asc']]);
    const alreadySignedByUsers = signatures.map((v) => v.createdBy);
    const needToBySignedByUsers = task.signerUsers;

    let nextSignerUserId;
    for (const [index, signer] of needToBySignedByUsers.entries()) {
      if (!alreadySignedByUsers.length || !alreadySignedByUsers[index]) {
        nextSignerUserId = signer;
        break;
      }

      if (signer !== alreadySignedByUsers[index]) {
        // There is invalid signers order (for example: duplicate sign from one user or somehow already signed in wrong order).
        throw new Error('checkSignersOrderAndGetNextSigner. Invalid signers order');
      }
    }

    return nextSignerUserId;
  }

  /**
   * @param {TaskEntity} task
   * @param {DocumentEntity} document
   * @param {string} nextSignerUserId
   * @return {Promise<void>}
   */
  async sendLetterToNextSigner({ task, document, nextSignerUserId }) {
    const multiSignControl = await this.getMultisignerControl(document.documentTemplateId);

    let userData;
    try {
      [userData] = await this.auth.getUsersByIds([nextSignerUserId], true);
    } catch (error) {
      throw new Error(`sendLetterToNextSigner. Cannot get user data from ID. ${error?.toString()}`, { cause: error });
    }
    const { userId, firstName, lastName, middleName = '', ipn, email } = userData;

    const signerUrl = this.config.multisigners.signersUrl
      .replace('{frontUrl}', this.config.auth.authRedirectUrl)
      .replace('//task', '/task') // Fix config.
      .replace('{taskId}', task.id)
      .replace('{schemaPath}', task.meta.multisignerSchemaPath);

    let letterTitle;
    let letterTemplate;
    try {
      letterTitle = this.sandbox.evalWithArgs(multiSignControl.letterTitle, [document], { checkArrow: true });
      const letterTemplateArgs = [document, firstName, lastName, middleName, ipn, email, signerUrl];
      letterTemplate = this.sandbox.evalWithArgs(multiSignControl.letterTemplate, letterTemplateArgs, { checkArrow: true });
    } catch (error) {
      throw new Error(`sendLetterToNextSigner. Evaluate multiSignerControl.letterTitle/letterTemplate error. ${error?.toString()}`, { cause: error });
    }

    const templateId = multiSignControl.templateId || LETTER_FOR_SIGNERS_TEMPLATE_ID;

    await this.notifier.sendToUser([userId], letterTitle, letterTemplate, templateId);
  }

  /**
   * Send letter to signers.
   * @param {object} document Document.
   * @param {object} task Task.
   * @param {Array} signerIds Array with signers ID.
   * @param {string} userId User ID.
   * @param {boolean} isCancelSignsLetter Letter about signs cancelation indicator.
   * @param {boolean} [isSignaturesLimitRaised] Is signature limit raised indicator.
   * @param {boolean} [isContinueSign] Is continue sign.
   * @param {boolean} [appendPerformers] Append performers to send
   */
  async sendLetterToSigners(
    document,
    task,
    signerIds,
    userId,
    isCancelSignsLetter,
    isSignaturesLimitRaised,
    isContinueSign,
    appendPerformers = false,
  ) {
    // Define params.
    const { documentTemplateId } = document || {};
    const { id: taskId } = task || {};
    const performerUserIds = task && task.performerUsers;
    const multisignerSchemaPath = task && task.meta && task.meta.multisignerSchemaPath;

    // Prepare letter to signers.
    let multisignerControl;
    try {
      multisignerControl = await this.getMultisignerControl(documentTemplateId);
    } catch (error) {
      log.save('sign-document-get-multisigner-control-error', error, 'error');
      throw error;
    }
    if (!multisignerControl || !multisignerSchemaPath) {
      throw new Error('Can\'t find multisigner control.');
    }

    const calcSignersFormula = multisignerControl.calcSigners;
    if (!calcSignersFormula || typeof calcSignersFormula !== 'string' || !calcSignersFormula.startsWith('(')) {
      log.save('multisigners-get-calculate-formula-error', { calcSignersFormula, taskId }, 'error');
      throw new Error('Can not find formula to calculate signers in JSON schema.');
    }

    // Calculate signers array.
    let signersArray = this.sandbox.evalWithArgs(calcSignersFormula, [document], { meta: { fn: 'calcSigners', documentId: document.id } });
    if (!signersArray) {
      log.save('multisigners-calculate-signers-by-formula-error', { taskId }, 'error');
      throw new Error('Can\'t calculate signers by formula.');
    }

    // Filter signers.
    let signerNotPerformerIds = signerIds.filter((v) => !performerUserIds.includes(v));

    if (appendPerformers) {
      signerNotPerformerIds = signerNotPerformerIds.concat(performerUserIds).filter((userId, index, self) => self.indexOf(userId) === index);
    }

    // Get signers data from ID.
    let signersData;
    const withPrivateProps = true;
    try {
      signersData = await this.auth.getUsersByIds(signerNotPerformerIds, withPrivateProps);
    } catch (error) {
      log.save('send-letter-to-signers-error', error, 'error');
      throw new Error(error.message, { cause: error });
    }

    // Form task url for signers.
    const frontUrl = `${this.config.auth?.authRedirectUrl}/`;
    let signerUrl = this.config.multisigners && this.config.multisigners.signersUrl;
    const options = { frontUrl, taskId, schemaPath: multisignerSchemaPath }; // Replace keys with data.
    for (const key in options) {
      const replacePattern = new RegExp(`\\{${key}\\}`, 'g');
      signerUrl = signerUrl.replace(replacePattern, options[key]);
    }
    signerUrl = signerUrl.replace('///tasks', '/tasks').replace('//tasks', '/tasks');

    // Get data to send emails by user ids.
    let letterTemplateFormula = isCancelSignsLetter ? multisignerControl.cancelSignsLetterTemplate : multisignerControl.letterTemplate;
    let titleFormula = isCancelSignsLetter ? multisignerControl.cancelSignsLetterTitle : multisignerControl.letterTitle;
    if (isSignaturesLimitRaised) {
      letterTemplateFormula = multisignerControl.minSignaturesLimitLetterTemplate;
      titleFormula = multisignerControl.minSignaturesLimitLetterTitle;
    }
    if (isContinueSign) {
      letterTemplateFormula = multisignerControl.continueSignLetterTemplate;
      titleFormula = multisignerControl.continueSignLetterTitle;
    }
    const templateId = multisignerControl.templateId || LETTER_FOR_SIGNERS_TEMPLATE_ID;
    if (!letterTemplateFormula && !titleFormula) {
      throw new Error('Can not find letter template data.');
    }

    let dataForMail = signersData
      .filter(Boolean)
      .filter(({ ipn }) => ipn && ipn !== 'null')
      .map((v) => {
        const signerControlUserInfo = signersArray.find((el) => el.ipn === v.ipn);

        if (!signerControlUserInfo) {
          return;
        }

        const equalEmails = signerControlUserInfo && signerControlUserInfo.email === v.email;
        const firstName = v.firstName && v.firstName !== 'null' ? v.firstName : signerControlUserInfo.firstName;
        const lastName = v.lastName && v.lastName !== 'null' ? v.lastName : signerControlUserInfo.lastName;
        const middleName = v.middleName === '' ? '' : v.middleName && v.middleName !== 'null' ? v.middleName : signerControlUserInfo.middleName;

        const template =
          typeof letterTemplateFormula === 'string' &&
          this.sandbox.evalWithArgs(
            letterTemplateFormula,
            [
              document,
              firstName,
              lastName,
              middleName || '',
              v.ipn,
              equalEmails ? v.email : signerControlUserInfo && signerControlUserInfo.email,
              signerUrl,
            ],
            { checkArrow: true, meta: { fn: 'letterTemplateFormula', documentId: document.id } },
          );

        const title =
          typeof titleFormula === 'string' &&
          this.sandbox.evalWithArgs(titleFormula, [document], { checkArrow: true, meta: { fn: 'titleFormula', documentId: document.id } });

        return {
          userId: v.userId,
          email: equalEmails ? v.email : signerControlUserInfo && signerControlUserInfo.email,
          template,
          title,
          otherEmail: equalEmails ? false : true,
        };
      })
      .filter(Boolean);

    // Send letter by user Ids.
    const sendLetterByUserIdsPromises = dataForMail.map((v) => this.notifier.sendToUser(v.userId, v.title, v.template, templateId));
    Promise.all(sendLetterByUserIdsPromises).catch((error) => {
      log.save('send-emails-to-signers-error', { error }, 'error');
      throw error;
    });

    // Send letter by user emails.
    const usersWithOtherEmails = dataForMail.filter((v) => v.otherEmail);
    const sendLetterByUserEmailsPromises = usersWithOtherEmails.map((v) => this.notifier.sendByEmails(v.email, v.title, v.template, templateId));
    Promise.all(sendLetterByUserEmailsPromises).catch((error) => {
      log.save('send-emails-to-signers-error', { error }, 'error');
      throw error;
    });

    return;
  }

  /**
   * Check and save data from external reader.
   * @param {object} params Params.
   * @param {string} params.oauthToken OAuth token.
   * @param {string} params.service External service service.
   * @param {string} params.method External service method.
   * @param {string} params.documentId Document ID.
   * @param {string} params.path Path.
   * @param {number|number[]} params.index Index.
   * @param {object} params.user User.
   * @param {string} params.userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} params.userUnitIds User unit IDs.
   * @param {string} enabledMocksHeader
   * @returns {Promise<DocumentEntity>} Document entity.
   */
  async checkAndSaveDataFromExternalReader({
    oauthToken,
    service,
    method,
    captchaPayload,
    documentId,
    path,
    index,
    user,
    userId,
    userUnitIds,
    enabledMocksHeader,
  }) {
    // Get document.
    const document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    if (document.isFinal === true) {
      throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
    }

    let pathForSavingInDocument = path.replace(/.properties./g, '.');
    if (typeof index !== 'undefined') {
      path = path.replace(/\.\$\{index\}\./g, '.'); // Replace example from ".${index}." to ".".
      if (Array.isArray(index)) {
        for (let i = 0; i < index.length; i++) {
          pathForSavingInDocument = pathForSavingInDocument.replace(/\.items\./g, '.').replace(/\.\$\{index\}/, `[${index[i]}]`); // Replace example from ".${index}" to "[i]".
        }
      } else {
        pathForSavingInDocument = pathForSavingInDocument.replace(/\.items\./g, '.').replace(/\.\$\{index\}/g, `[${index}]`); // Replace example from ".items." to "." and ".${index}" to "[0]".
      }
    }

    // Get document template.
    const documentTemplate = await models.documentTemplate.findById(document.documentTemplateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema } = documentTemplate;

    // Check and get property by path.
    const externalReaderCheckProperty = PropByPath.get(jsonSchema.properties, path);
    if (!externalReaderCheckProperty) {
      throw new Error('Can not find external reader check property in JSON schema.');
    }

    // Check if exists control.
    if (typeof externalReaderCheckProperty.control === 'undefined' || externalReaderCheckProperty.control !== 'externalReaderCheck') {
      throw new Error('Can not find control externalReaderCheck in JSON schema.');
    }

    const documentDataObject = document.data;

    // Define function for using in eval.
    // eslint-disable-next-line no-unused-vars
    const numberGenerator = (template) => this.numberGenerator.generateFromRawTemplate(template);

    let nonUserFilter = {};
    if (typeof externalReaderCheckProperty.filters !== 'undefined') {
      for (let [name, value] of Object.entries(externalReaderCheckProperty.filters)) {
        if (Array.isArray(index)) {
          for (let i = 0; i < index.length; i++) {
            value = value.replace(/\.\$\{index\}/, `[${index[i]}]`); // Replace example from ".${index}" to "[i]".
          }
        } else if (typeof index !== 'undefined') {
          value = value.replace(/\.\$\{index\}/g, `[${index}]`); // Replace example from ".${index}" to "[0]".
        }

        // Get value as is
        if (typeof value !== 'string') {
          nonUserFilter[name] = value;
        // Get value as is
        } else if (value.startsWith('#')) {
          nonUserFilter[name] = value.substring(1);
        // Get value from function.
        } else if (value.startsWith('(')) {
          const filterPathExists = typeof externalReaderCheckProperty.filtersPath !== 'undefined';
          if (!filterPathExists) {
            throw new Error('`filtersPath` is required when using functions for defining filters parameters.');
          }

          const stepPath = pathForSavingInDocument.split('.')[0];
          const stepDataObject = PropByPath.get(documentDataObject, stepPath);

          const parentPath = pathForSavingInDocument.split('.').slice(0, -1).join('.');
          const parentDataObject = PropByPath.get(documentDataObject, parentPath);

          nonUserFilter[name] = this.sandbox.evalWithArgs(
            value,
            [
              {
                step: stepDataObject,
                document: documentDataObject,
                parent: parentDataObject,
              },
            ],
            { meta: { fn: 'externalReaderCheckProperty', documentId: document.id, service, method, path } },
          );
        // Get value from document
        } else {
          nonUserFilter[name] = PropByPath.get(documentDataObject, value);
        }
      }
    }

    // Handle timeoutInSeconds.
    let customTimeout;
    if (typeof externalReaderCheckProperty.timeoutInSeconds !== 'undefined') {
      const timeoutInSeconds = parseInt(externalReaderCheckProperty.timeoutInSeconds, 10);

      if (!isNaN(timeoutInSeconds) && timeoutInSeconds > 0) {
        customTimeout = nonUserFilter.customTimeout = timeoutInSeconds * 1000;
      }
    }

    // Handle extra params.
    const {
      requestTimeout,
      isSaveAttachments,
      deleteOldAttachmentsBeforeSave,
      isRewriteAttachmentsOnEachRequest,
      prepareAttachments,
      responseDecorator,
    } = externalReaderCheckProperty;
    const extraParams = { documentId: document.id, deleteOldAttachmentsBeforeSave };

    if (typeOf(requestTimeout) === 'number') {
      extraParams.requestTimeout = requestTimeout;
    }

    if (typeOf(isSaveAttachments) === 'string' && isSaveAttachments.startsWith('(')) {
      try {
        extraParams.isSaveAttachments = this.sandbox.evalWithArgs(isSaveAttachments, [document], {
          meta: { fn: 'isSaveAttachments', documentId: document.id, service, method, path },
        });
      } catch (error) {
        throw new EvaluateSchemaFunctionError(`externalReaderCheck.isSaveAttachments function throw error: ${error.toString()}`);
      }
    }
    if (typeOf(isSaveAttachments) === 'boolean' && isSaveAttachments) {
      extraParams.isSaveAttachments = isSaveAttachments;
    }

    if (typeOf(isRewriteAttachmentsOnEachRequest) === 'string' && isRewriteAttachmentsOnEachRequest.startsWith('(')) {
      try {
        extraParams.isRewriteAttachmentsOnEachRequest = this.sandbox.evalWithArgs(isRewriteAttachmentsOnEachRequest, [document], {
          meta: { fn: 'isRewriteAttachmentsOnEachRequest', documentId: document.id, service, method, path },
        });
      } catch (error) {
        throw new EvaluateSchemaFunctionError(`externalReaderCheck.isRewriteAttachmentsOnEachRequest function throw error: ${error.toString()}`);
      }
    }
    if (typeOf(isRewriteAttachmentsOnEachRequest) === 'boolean' && isRewriteAttachmentsOnEachRequest) {
      extraParams.isRewriteAttachmentsOnEachRequest = isRewriteAttachmentsOnEachRequest;
    }

    extraParams.prepareAttachments = prepareAttachments;

    log.save('check-and-save-data-from-external-reader-prepared-filter', { service, method, documentId, userId, path, nonUserFilter, extraParams });

    // Check onRequest handlers.
    if (typeOf(externalReaderCheckProperty.onRequest) === 'object') {
      const onRequest = externalReaderCheckProperty.onRequest;

      if (onRequest.isRemovePreviousResponse) {
        const isRemovePreviousResponse =
          typeOf(onRequest.isRemovePreviousResponse) === 'boolean'
            ? onRequest.isRemovePreviousResponse
            : this.sandbox.evalWithArgs(onRequest.isRemovePreviousResponse, [document], {
              meta: { fn: 'isRemovePreviousResponse', documentId: document.id, service, method, path },
            });

        if (typeOf(isRemovePreviousResponse) !== 'boolean') {
          throw new InvalidSchemaError('externalReaderCheck.onRequest.isRemovePreviousResponse should be type of (boolean|function<boolean>).');
        }
        if (isRemovePreviousResponse) {
          PropByPath.delete(documentDataObject, pathForSavingInDocument);
          const updatedDocument = await models.document.updateData(documentId, userId, documentDataObject);
          if (!updatedDocument) {
            throw new Error(ERROR_UPDATE_DOCUMENT);
          }
        }
      }

      if (onRequest.isRemovePreviousAttachments) {
        // Remove old attachments with the same external-reader method.
        let attachments;
        try {
          attachments = await this.documentAttachmentModel.getByDocumentIdAndMeta(documentId, { fromExternalReader: `${service}.${method}` });
        } catch (error) {
          throw new Error(`DocumentBusiness.checkAndSaveDataFromExternalReader. Cannot get old attachments info for rewriting. ${error.toString()}`, { cause: error });
        }

        try {
          await Promise.all(attachments.map((v) => this.storageService.provider.deleteFile(v.link)));
        } catch (error) {
          // Do not throw error. This error should not block saving new attachments.
          log.save(
            'document-business|check-and-save-data-from-external-reader|delete-file-from-file-storage-error',
            { error: error.toString() },
            'warn',
          );
        }

        try {
          await Promise.all(attachments.map((v) => this.documentAttachmentModel.delete(v.id)));
        } catch (error) {
          throw new Error(`DocumentBusiness.checkAndSaveDataFromExternalReader. Cannot delete old attachments. ${error.toString()}`, { cause: error });
        }
      }
    }

    // Get data from external reader.
    const userUnits = { head: userUnitIds.head, member: userUnitIds.member };
    const externalReaderResult = await this.externalReader.getDataByUser(
      service,
      method,
      captchaPayload,
      oauthToken,
      user,
      nonUserFilter,
      extraParams,
      userUnits,
      enabledMocksHeader,
      undefined,
      customTimeout,
    );
    if (!externalReaderResult || typeof externalReaderResult.data === 'undefined') {
      throw new Error('Can\'t get external reader check data.');
    }
    log.save('external-reader-check-data', { externalReaderResult });

    // Get current document data (maybe updated during External Reader handling).
    const documentToUpdate = await models.document.findById(documentId);
    const documentDataToUpdate = documentToUpdate.data;

    let responseData = externalReaderResult.data;

    // Handle response decorator.
    if (responseDecorator && responseDecorator.includes('=>')) {
      const decoratedResponse = this.sandbox.evalWithArgs(responseDecorator, [externalReaderResult.data], {
        meta: { fn: 'responseDecorator', documentId: document.id, service, method, path },
      });

      responseData = {
        decorated: decoratedResponse,
        raw: externalReaderResult.data,
      };
    }

    // Update document with external reader data.
    PropByPath.set(documentDataToUpdate, pathForSavingInDocument, responseData);

    // Save nonUserFilter in document by filtersPath.
    if (typeof externalReaderCheckProperty.filtersPath !== 'undefined') {
      let pathForSavingFiltersInDocument = externalReaderCheckProperty.filtersPath.replace(/.properties./g, '.');
      if (typeof index !== 'undefined') {
        if (Array.isArray(index)) {
          for (let i = 0; i < index.length; i++) {
            pathForSavingFiltersInDocument = pathForSavingFiltersInDocument.replace(/\.items\./g, '.').replace(/\.\$\{index\}/, `[${index[i]}]`); // Replace example from ".${index}" to "[i]".
          }
        } else {
          pathForSavingFiltersInDocument = pathForSavingFiltersInDocument.replace(/\.items\./g, '.').replace(/\.\$\{index\}/g, `[${index}]`); // Replace example from ".items." to "." and ".${index}" to "[0]".
        }
      }
      PropByPath.set(documentDataToUpdate, pathForSavingFiltersInDocument, nonUserFilter);
    }

    const updatedDocument = await models.document.updateData(documentId, userId, documentDataToUpdate);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    log.save('updated-document-with-external-reader-check-data', { updatedDocument: { ...updatedDocument, data: HIDE_REPLACEMENT_TEXT } }); // Do not log large document.data.

    // Check onResponse handlers.
    if (typeOf(externalReaderCheckProperty.onResponse) === 'object') {
      const { addMemberToUnitByUserId, startAutoCommitTimer } = externalReaderCheckProperty.onResponse;

      if (typeOf(addMemberToUnitByUserId) === 'object') {
        let isExecute, userId, unitId;
        try {
          isExecute = this.sandbox.evalWithArgs(addMemberToUnitByUserId.isExecute, [{ document, response: externalReaderResult.data }], {
            meta: { fn: 'addMemberToUnitByUserId.isExecute', documentId: document.id, service, method, path },
          });
        } catch (error) {
          throw new EvaluateSchemaFunctionError('externalReaderCheck.onResponse.addMemberToUnitByUserId.isExecute schema function throw error.', {
            cause: { error: error.toString() },
          });
        }
        try {
          userId = this.sandbox.evalWithArgs(addMemberToUnitByUserId.userId, [{ document }], {
            meta: { fn: 'addMemberToUnitByUserId.userId', documentId: document.id, service, method, path },
          });
        } catch (error) {
          throw new EvaluateSchemaFunctionError('externalReaderCheck.onResponse.addMemberToUnitByUserId.userId schema function throw error.', {
            cause: { error: error.toString() },
          });
        }
        try {
          unitId = this.sandbox.evalWithArgs(addMemberToUnitByUserId.unitId, [{ document }], {
            meta: { fn: 'addMemberToUnitByUserId.unitId', documentId: document.id, service, method, path },
          });
        } catch (error) {
          throw new EvaluateSchemaFunctionError('externalReaderCheck.onResponse.addMemberToUnitByUserId.unit schema function throw error.', {
            cause: { error: error.toString() },
          });
        }

        if (typeOf(isExecute) !== 'boolean') {
          throw new EvaluateSchemaFunctionError(
            'externalReaderCheck.onResponse.addMemberToUnitByUserId.isExecute schema function must return boolean value.',
          );
        }

        if (isExecute) {
          this.unitModel.addMember(unitId, userId);
        }
      }

      if (typeOf(startAutoCommitTimer) === 'object') {
        let isExecute;
        let timer;
        try {
          isExecute = this.sandbox.evalWithArgs(
            startAutoCommitTimer.isExecute,
            [{ document: documentToUpdate, response: externalReaderResult.data }],
            { meta: { fn: 'startAutoCommitTimer.isExecute', documentId: document.id, service, method, path } },
          );
          timer = this.sandbox.evalWithArgs(startAutoCommitTimer.timer, [{ document: documentToUpdate }], {
            meta: { fn: 'startAutoCommitTimer.timer', documentId: document.id, service, method, path },
          });
        } catch (error) {
          throw new EvaluateSchemaFunctionError('externalReaderCheck.onResponse.startAutoCommitTimer schema function throw error.', {
            cause: { error: error?.toString() },
          });
        }

        if (isExecute) {
          if (!Object.keys(global.config?.message_queue?.delayedAutoCommitQueues || {})?.includes(timer)) {
            throw new InvalidSchemaError('externalReaderCheck.onResponse.startAutoCommitTimer. Invalid \'timer\' value.');
          }

          const message = { taskId: documentToUpdate.task.id };
          global.messageQueue.produce(message, 'delayedAutoCommit', `${global.config.message_queue.readingQueueName}-delayed-auto-commit-${timer}`);
        }
      }
    }

    // Return document.
    return updatedDocument;
  }

  /**
   * Update verified user info.
   * @param {string} documentId Document ID.
   * @param {object} params Params.
   * @param {string} params.userId User ID.
   * @param {string} params.oauthToken OAuth token.
   * @param {number[]} params.userUnitIds User unit IDs.
   * @param {object} params.userInfo User info.
   * @param {string} params.enabledMocksHeader
   * @returns {Promise<DocumentEntity>} Document entity.
   */
  async updateVerifiedUserInfo(documentId, { userId, oauthToken, userUnitIds, userInfo, enabledMocksHeader }) {
    // Get document.
    const document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    if (document.isFinal === true) {
      throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
    }

    // Get document template.
    if (!document.documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema } = document.documentTemplate || {};

    // Get document data object.
    const documentData = document.data;

    await this.verifiedUserInfoFiller.fill(jsonSchema, documentData, {
      oauthToken,
      userInfo,
      enabledMocksHeader,
    });

    // Save document.
    const updatedDocument = await models.document.updateData(documentId, userId, documentData);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }

    return updatedDocument;
  }

  /**
   * Create attachments for system task.
   * @param {Array} files. Files list to save.
   * @param {string} documentId.
   * @param {DocumentEntity} document.
   * @param {string} userId.
   * @param {Array<string>} userUnitIds.
   * @param {boolean} [isKeepDocumentFile]
   */
  async createAttachmentsForSystemTask(files, documentId, userId, userUnitIds, isKeepDocumentFile = false) {
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
      let uploadFilePromise = this.storageService.provider.uploadFileFromStream(readableStream, name, undefined, contentType, contentLength);
      filesDataPromises.push(uploadFilePromise);
    }

    const uploadFilesInfo = await Promise.allSettled(filesDataPromises);

    const rejectedFiles = uploadFilesInfo.map(({ status, reason }, index) => status === 'rejected' && { reason, index }).filter(Boolean);
    if (rejectedFiles.length) {
      log.save('create-attachments-for-system-task|upload-file-rejected', { rejectedFiles });
      throw new Error(rejectedFiles.map((item) => `File ${files[item.index].name} upload error: ${item.reason}`).join(', '));
    }

    // Create attachment.
    for (const fileInfoIndex in uploadFilesInfo) {
      // Add to DB.
      const { value: fileInfo } = uploadFilesInfo[fileInfoIndex];

      let attachment = this.documentAttachmentModel.create({
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
      const updatedDocument = await models.document.findById(documentId);
      await businesses.document.saveAttachmentToDocumentData(
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
   * Get payment receipt info.
   * @param {string} paymentControlPath Payment control path.
   * @param {string} documentId Document Id.
   * @param {string} orderId Order Id.
   * @param {string} userId User Id.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   */
  async getPaymentReceiptInfo(paymentControlPath, documentId, orderId, userId, userUnitIds) {
    // Get payment system params.
    let paymentSystemParams;
    try {
      paymentSystemParams = await this.getPaymentProviderOptionsByDocId(paymentControlPath, documentId, userId, userUnitIds);
    } catch (error) {
      log.save('get-payment-receipt-get-system-params-error', { error, documentId, orderId, userId });
      throw error;
    }

    const receipt = await this.paymentService.getPaymentReceiptInfo(paymentSystemParams, orderId);
    if (!receipt) {
      throw new Error('Can\'t get payment receipt.');
    }
    log.save('get-payment-receipt', { receipt });

    return receipt;
  }

  /**
   * Get withdrawal funds status.
   * @param {string} paymentControlPath Payment control path.
   * @param {string} documentId Document Id.
   * @param {string} orderId Order Id.
   * @param {string} userId User Id.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   */
  async getWithdrawalFundsStatus(paymentControlPath, documentId, orderId, userId, userUnitIds) {
    // Get payment system params.
    let paymentSystemParams;
    try {
      paymentSystemParams = await this.getPaymentProviderOptionsByDocId(paymentControlPath, documentId, userId, userUnitIds);
    } catch (error) {
      log.save('get-withdrawal-status-get-system-params-error', { error, documentId, orderId, userId });
      throw error;
    }

    const withdrawalStatus = await this.paymentService.getWithdrawalFundsStatus(paymentSystemParams, orderId);
    if (!withdrawalStatus) {
      throw new Error(ERROR_GET_PAYMENT_DATA);
    }
    log.save('get-withdrawal-status-result', { withdrawalStatus });

    return withdrawalStatus;
  }

  /**
   * Get payment provider options by document id.
   * @param {string} paymentControlPath Payment control path.
   * @param {string} documentId Document Id.
   * @param {string} userId User Id.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   */
  async getPaymentProviderOptionsByDocId(paymentControlPath, documentId, userId, userUnitIds) {
    // Get document.
    const document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document || !document.task) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Get document template.
    const templateId = document.documentTemplateId;
    const documentTemplate = await models.documentTemplate.findById(templateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema } = documentTemplate;

    // Get provider options.
    const paymentProperties = PropByPath.get(jsonSchema && jsonSchema.properties, paymentControlPath);
    if (!paymentProperties) {
      throw new Error('Can not find payment properties in JSON schema.');
    }
    log.save('payment-properties', { documentTemplateId: documentTemplate.id, documentTemplateName: documentTemplate.name, paymentProperties });
    const paymentCustomer = paymentProperties && paymentProperties.customer;
    const paymentSystemParams = this.config.payment && this.config.payment[paymentCustomer];

    return paymentSystemParams;
  }

  /**
   * Get strict payment control path.
   * @param {object} jsonSchema Document json schema.
   */
  getStrictPaymentControlPath(jsonSchema) {
    const paymentControlArray = JSONPath(`$..[?(@.control === '${PAYMENT_CONTROL_NAME}')]`, jsonSchema);
    const paymentWidgetControlArray = JSONPath(`$..[?(@.control === '${PAYMENT_CONTROL_WIDGET_NAME}')]`, jsonSchema);
    const paymentWidgetNewControlArray = JSONPath(`$..[?(@.control === '${PAYMENT_CONTROL_WIDGET_NEW_NAME}')]`, jsonSchema);

    let paymentPaths = [],
      paymentWidgetPaths = [],
      paymentWidgetNewtPaths = [];

    if (paymentControlArray.length) {
      paymentPaths = paymentControlArray.filter((v) => v.strictPayment).map((v) => v.paymentControlPath);
    }

    if (paymentWidgetControlArray.length) {
      paymentWidgetPaths = paymentWidgetControlArray.filter((v) => v.strictPayment).map((v) => v.paymentControlPath);
    }

    if (paymentWidgetNewControlArray.length) {
      paymentWidgetNewtPaths = paymentWidgetNewControlArray.filter((v) => v.strictPayment).map((v) => v.paymentControlPath);
    }

    return [...paymentPaths, ...paymentWidgetPaths, ...paymentWidgetNewtPaths];
  }

  /**
   * Create block.
   * @private
   * @param { string } name Name.
   * @param { Buffer } contentBuffer Content buffer.
   * @returns { Buffer } Block buffer.
   */
  createBlock(name, contentBuffer) {
    const zeroSymbolBuffer = Buffer.alloc(1);
    const nameBuffer = Buffer.from(name);
    let contentSizeBuffer = Buffer.allocUnsafe(4);
    contentSizeBuffer.writeUInt32LE(Buffer.byteLength(contentBuffer));
    const blockBuffer = Buffer.concat([nameBuffer, zeroSymbolBuffer, contentSizeBuffer, contentBuffer]);
    return blockBuffer;
  }

  /**
   * Create UA1_SIGN block.
   * @private
   * @param {Buffer} p7sBuffer P7S buffer.
   * @returns {Buffer} UA1_SIGN block buffer promise.
   */
  createUa1signBlock(p7sBuffer) {
    const ua1signBlockBuffer = this.createBlock('UA1_SIGN', p7sBuffer);
    return ua1signBlockBuffer;
  }

  /**
   * Get data to encrypt.
   * @param {string} documentId Document ID.
   */
  async getDataToEncrypt(documentId, encryptionType = 'taxClaim') {
    // Get additional data signature (to encrypt).
    const additionalDataSignatureList = await global.models.additionalDataSignature.getByDocumentId(documentId);

    // Handle all additional data signature list to get data to encrypt.
    let toEncrypt = [];
    const filteredAdditionalDataSignatureList = additionalDataSignatureList.filter((v) => v.cryptCertificate);
    for (const additionalDataSignature of filteredAdditionalDataSignatureList) {
      if (!additionalDataSignature || !additionalDataSignature.signature) {
        throw new Error('Can not define signature for document (to encrypt).');
      }
      const p7sBase64 = additionalDataSignature.signature;
      const p7sBuffer = Buffer.from(p7sBase64, 'base64');

      // Prepare data to encrypt accordance to encryption type.
      let ua1signBlockBuffer;
      switch (encryptionType) {
        case 'taxClaim':
          ua1signBlockBuffer = this.createUa1signBlock(p7sBuffer);
          break;
        default:
          ua1signBlockBuffer = this.createUa1signBlock(p7sBuffer);
      }
      const ua1signBlockBase64 = ua1signBlockBuffer.toString('base64');
      toEncrypt.push(ua1signBlockBase64);
    }

    // Return data to encrypt.
    return toEncrypt;
  }

  /**
   * Save encrypted data.
   * @param {string} documentId Document ID.
   * @param {string} encryptedItems Encrypted data items.
   * @param {string} encryptedDataCertificate Encrypted data certificate.
   */
  async saveEncryptedData(documentId, encryptedItems, encryptedDataCertificate) {
    // Define additional data signatures.
    const additionalDataSignatureList = await global.models.additionalDataSignature.getByDocumentId(documentId);
    const filteredAdditionalDataSignatureList = additionalDataSignatureList.filter((v) => v.cryptCertificate);

    // Check count.
    if (filteredAdditionalDataSignatureList.length !== encryptedItems.length) {
      throw new Error('Incorrect encrypted items count.');
    }

    // Handle all items.
    for (let i = 0; i < encryptedItems.length; i++) {
      // Define params.
      const additionalDataSignatureItem = filteredAdditionalDataSignatureList[i];
      const encryptedItem = encryptedItems[i];
      const { id: additionalDataSignatureId } = additionalDataSignatureItem;

      // Save encrypted data.
      await global.models.additionalDataSignature.saveEncryptedData(additionalDataSignatureId, encryptedItem, encryptedDataCertificate);
    }
  }

  /**
   * @param {Object} options
   * @param {string} options.validationUrl
   * @param {string} options.displayName
   * @param {string} options.initiative
   * @param {string} options.initiativeContext
   * @return {Promise<Object>}
   */
  async validateApplePaySession({ validationUrl, displayName, initiative, initiativeContext }) {
    // Check config.
    const config = global.config?.payment?.applePay;
    if (!config) {
      throw new InvalidConfigError('payment.applePay required.');
    }

    // Check domain name.
    const { host } = new URL(validationUrl);
    if (host !== config.allowedApplePayGateway) {
      throw new ForbiddenError(`validationUrl domain ${host} is not allowed Apple Pay gateway.`);
    }

    // Send request to Apple API.
    const response = await global.httpClient.request(
      validationUrl,
      {
        agent: new https.Agent({
          cert: Buffer.from(config.merchantIdentityCertificateInBase64, 'base64').toString('utf-8'),
          key: Buffer.from(config.merchantIdentityPrivateKeyInBase64, 'base64').toString('utf-8'),
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantIdentifier: config.merchantIdentifier,
          displayName,
          initiative,
          initiativeContext,
        }),
      },
      'validate-apple-pay-session',
    );

    return await response.json();
  }

  /**
   * Save attachment to document data.
   * @param {object} attachment Attachment.
   * @param {string} documentPath Document data path to save attachment info.
   * @param {{id: string, data: object}} document Document.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs info.
   * @param {boolean} isFromSystemTask.
   * @param {boolean} [isKeepDocumentFile].
   */
  async saveAttachmentToDocumentData(attachment, documentPath, document, userId, userUnitIds, isFromSystemTask = false, isKeepDocumentFile = false) {
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
    await this.update(documentId, properties, userId, userUnitIds, isFromSystemTask, isKeepDocumentFile);
  }

  /**
   * Add generating pdf to queue.
   * @param {object} document Document.
   * @param {string} userId User ID.
   */
  async addGeneratingPdfToQueue(document, userId) {
    if (document.fileId === 'generating' && global.redisClient && (await global.redisClient.get(`generating-pdf-document-${document.id}`))) {
      return;
    }

    await models.document.addDocumentFile({
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
   * @param {{document: object, userId: string}} object Params.
   * @returns {Promise<Buffer>}
   */
  async createPdf({ document, userId }) {
    const documentId = document.id;
    const workflow = await models.workflow.findById(document.task.workflowId);
    if (!workflow) {
      throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
    }

    // Get template data.
    const documentTemplate = await models.documentTemplate.findById(document.documentTemplateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }

    log.save('create-pdf', { cfg: global.config });
    const { variables, ...staticFileOptions } = global.config.file_generator;

    // Define file HTMLs.
    let htmls = [];
    // Create PDF.
    const htmlsString = await this.fileGeneratorService.createHtml({
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
        const conditionResult = this.sandbox.evalWithArgs(condition, [document.data], { meta: { fn: 'htmlsString.condition', documentId } });
        if (conditionResult) {
          htmls.push(currentHtml);
        }
      }

      // Check if wrong schema.
      if (allHtmlParts.length > 2) {
        log.save('html-schema-delimiter-error', { allHtmls, currentHtmlWithError: allHtmlParts }, 'error');
        throw new Error('Wrong HTML schema delimiters.');
      }
    }

    // Handle all HTML templates.
    let mainPdfBuffer;
    let mainFileId;
    let attachmentIds = [];
    let mainPdfFileName;
    let mainPdfFileSize;
    let attachesPdfFileNames = [];
    let attachesPdfFileSizes = [];
    let attachesMetaData = {};

    for (const htmlIndex in htmls) {
      // Define HTML.
      let html = htmls[htmlIndex];

      // Create and upload file.
      let pdfBuffer;
      let fileInfo;
      const pdfFileNameSchema =
        typeof documentTemplate.jsonSchema.fileName === 'string'
          ? this.sandbox.evalWithArgs(documentTemplate.jsonSchema.fileName, [document.data], {
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

      const bufferStream = PassThrough();
      let pdfOptions = {
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

      pdfBuffer = await this.fileGeneratorService.createPdf(html, pdfOptions);
      bufferStream.end(pdfBuffer);

      fileInfo = await this.storageService.provider.uploadFileFromStream(bufferStream, pdfFileName, undefined, APLICATION_PDF, pdfBuffer.length);

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
      await models.documentSignature.deleteByDocumentId(documentId);
      await models.documentSignatureRejection.deleteByDocumentId(documentId);
    }

    // Add file id, name, type if not exist
    if (!document.fileId) document.fileId = mainFileId;
    if (!document.fileName) document.fileName = mainPdfFileName;
    if (!document.fileType) document.fileType = APLICATION_PDF;

    // Add document file.
    let created = await models.document.addDocumentFile({
      id: documentId,
      updatedBy: userId,
      fileId: mainFileId,
      fileName: mainPdfFileName,
      fileType: APLICATION_PDF,
      fileSize: mainPdfFileSize,
    });
    if (!created) {
      throw new Error('Can\'t add file.');
    }

    // Delete last attachments.
    await models.documentAttachment.deleteGeneratedByDocumentId(documentId);

    // Save attachments.
    let attachments = [];
    for (let attachmentIndex in attachmentIds) {
      let attachment;
      attachment = await models.documentAttachment.create({
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
   * @param {object} messageObject AMQP message object.
   */
  async createPdfFromMessage(messageObject) {
    try {
      const document = await models.document.findById(messageObject.documentId);
      if (!document) {
        throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
      }
      const documentSignatures = await models.documentSignature.getByDocumentId(messageObject.documentId);
      const documentSignatureRejections = await models.documentSignatureRejection.getByDocumentId(messageObject.documentId);
      document.signatures = documentSignatures;
      document.signatureRejections = documentSignatureRejections;

      const pdf = await this.createPdf({ document, userId: messageObject.userId });
      if (!pdf) {
        throw new Error('PDF wasn\'t created.');
      }
    } catch (error) {
      log.save('pdf-creating-by-message-from-queue-error', { messageObject, error: (error && error.message) || error });

      // If it errors, will delete state generating pdf.
      await models.document.addDocumentFile({
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

  /**
   * @param {{name: string, contentType: string, contentLength: string, fileContent: string}} pdf
   * @param {string} documentId
   * @param {string} userId
   * @return {Promise<void>}
   */
  async saveExternalPdf(pdf, documentId, userId) {
    const bufferStream = PassThrough();
    bufferStream.end(Buffer.from(pdf.fileContent, 'base64'));
    const fileInfo = await this.storageService.provider.uploadFileFromStream(
      bufferStream,
      pdf.name,
      'External PDF',
      pdf.contentType,
      Buffer.from(pdf.fileContent, 'base64').length,
    );

    // Add document file.
    const result = await models.document.addDocumentFile({
      id: documentId,
      updatedBy: userId,
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      fileType: fileInfo.contentType,
    });
    return result;
  }

  /**
   * @param {Object} params
   * @param {DocumentEntity} params.document
   * @param {Object} params.providerOptions
   * @param {string} params.orderId
   * @param {Object} params.paymentSchemaControl
   * @return {Promise<void>}
   */
  async tryToDownloadPaymentReceiptFiles({ document, providerOptions, orderId, paymentSchemaControl }) {
    try {
      const { receiptFormat = 'pdf', receiptMeta = '() => undefined;', receiptName } = paymentSchemaControl;

      const receiptFiles = await this.paymentService.getPaymentReceiptFiles(providerOptions, orderId, receiptFormat, paymentSchemaControl);

      const isCorrectMimeType = receiptFiles.every((receipt) => Helpers.isCorrectBufferMimeType(receipt.fileBuffer, receiptFormat));
      if (!isCorrectMimeType) {
        // This is possibly an error in response buffer.
        throw new Error('Invalid payment receipt mime type.');
      }

      for (const [index, receipt] of receiptFiles.entries()) {
        const fileIter = receiptFiles.length > 1 ? `-${index + 1}` : '';
        receipt.meta = this.sandbox.evalWithArgs(receiptMeta, [document], {
          meta: { fn: 'receiptMeta', documentId: document.id },
        });
        const originalFileName = receiptName
          ? `${receiptName}${fileIter}.${receiptFormat}`
          : `payment-receipt-${orderId}${fileIter}.${receiptFormat}`;
        const contentType = receipt.contentType;
        const contentLength = receipt.fileBuffer.length;

        // Upload file to file storage.
        const readableStream = new Readable();
        readableStream.push(receipt.fileBuffer);
        readableStream.push(null);
        const fileInfo = await this.storageService.provider.uploadFileFromStream(
          readableStream,
          originalFileName,
          undefined,
          contentType,
          contentLength,
        );

        // Insert file as attachment to document.
        await this.documentAttachmentModel.create({
          documentId: document.id,
          name: fileInfo.name,
          type: fileInfo.contentType,
          size: fileInfo.contentLength,
          link: fileInfo.id,
          isGenerated: false,
          isSystem: true,
          meta: receipt.meta,
        });
      }
    } catch (error) {
      // Do not throw error.
      log.save('download-payment-receipt-error', { error: error.toString() }, 'error');
    }
  }

  /**
   * @param {Object} task
   * @param {Object} actionParams
   * @param {Object} actionParams.userInfo. User info.
   * @param {string} actionParams.type. Action type: enum['sign', 'reject', 'delete_sign']
   */
  async addMultiSignInfo(task, { userInfo, type }) {
    // Check action type.
    const TYPES = ['sign', 'reject', 'delete_sign'];
    if (!TYPES.includes(type)) {
      throw new Error('Unknown action type');
    }

    // Define params.
    const { signerUsers = [], meta: taskMeta } = task;
    const signerUserIds = [...new Set(signerUsers)];
    const signerUsersCount = signerUserIds.length;

    // Check if multisigners not defined.
    if (signerUsersCount < 1) {
      return;
    }

    const multiSignInfo = taskMeta.multiSignInfo || {};
    let { rejected = false, signedBy = [], rejectedBy = [] } = multiSignInfo;
    const user = {
      userId: userInfo.userId,
      userName: `${userInfo.lastName.trim()} ${userInfo.firstName.trim()}${userInfo.middleName ? ' ' + userInfo.middleName.trim() : ''}`,
      createdAt: new Date().toJSON(),
      isPerformer: task.performerUsers.includes(userInfo.userId),
    };
    switch (type) {
      case 'sign':
        signedBy.push(user);
        break;
      case 'reject':
        rejectedBy.push(user);
        rejected = true;
        break;
      case 'delete_sign':
        signedBy = [];
        rejectedBy = [];
        rejected = false;
        break;
    }
    const metaObj = {
      multiSignInfo: { rejected, signedBy, rejectedBy },
    };
    businesses.task.addTaskMetadata(task, userInfo.userId, false, metaObj);
  }

  /**
   * @param {DocumentEntity} document
   * @param {Object} userInfo
   * @return {Promise<void>}
   */
  async handleStrictMultiSignCheck(document, userInfo) {
    const documentTemplate = await global.models.documentTemplate.findById(document.documentTemplateId);

    const strictMultiSignCheck = documentTemplate.jsonSchema?.strictMultiSignCheck || documentTemplate.jsonSchema?.strictMultisignCheck;
    if (!strictMultiSignCheck) {
      // Skip if strictMultiSignCheck isn`t defined.
      return;
    }

    if (
      (typeOf(strictMultiSignCheck?.isEnabled) !== 'string' && typeOf(strictMultiSignCheck?.isEnabled) !== 'boolean') ||
      typeOf(strictMultiSignCheck?.errors) !== 'array'
    ) {
      throw new InvalidSchemaError('Invalid strictMultiSignCheck control. isEnabled/errors required.');
    }

    let { isEnabled, excludeOwner, context: checkContext = [], errors: checkErrors = [] } = strictMultiSignCheck;

    try {
      isEnabled =
        typeOf(isEnabled) === 'string'
          ? this.sandbox.evalWithArgs(isEnabled, [document.data], { meta: { fn: 'strictMultiSignCheck.isEnabled', documentId: document.id } })
          : false;
    } catch (error) {
      throw new EvaluateSchemaFunctionError(`strictMultiSignCheck.isEnabled function throw error. $${error.toString()}`);
    }

    if (!isEnabled) {
      // Skip if strictMultiSignCheck disabled.
      return;
    }

    if (excludeOwner && document.ownerId === userInfo.userId) {
      throw new ForbiddenError('strictMultiSignCheck.excludeOwner. Owner cannot sign document.');
    }

    const context = await checkContext.reduce(
      async (accPromise, { name, provider, options, oauthToken }, index) => {
        const acc = await accPromise;
        const [providerType, service, method] = provider.split('.');

        let providerData;
        switch (providerType) {
          case 'external-reader': {
            let nonUserFilter;
            try {
              nonUserFilter = this.sandbox.evalWithArgs(options, [document.data], {
                meta: { fn: `strictMultiSignCheck.context[${index}].options`, documentId: document.id },
              });
            } catch (error) {
              throw new EvaluateSchemaFunctionError(`strictMultiSignCheck.context[${index}].options function throw error. $${error.toString()}`);
            }
            providerData = (await this.externalReader.getDataByUser(service, method, undefined, oauthToken, userInfo, nonUserFilter)).data;
          }
        }

        return { ...acc, [name]: providerData };
      },
      Promise.resolve({ user: userInfo }),
    );

    const errors = checkErrors.filter(({ check }, index) => {
      try {
        return this.sandbox.evalWithArgs(check, [document.data, context], {
          meta: { fn: `strictMultiSignCheck.errors[${index}].check`, documentId: document.id },
        });
      } catch (error) {
        throw new EvaluateSchemaFunctionError(`strictMultiSignCheck.errors[${index}].check function throw error. $${error.toString()}`);
      }
    });

    if (errors.length) {
      const [firstError] = errors;
      throw new Error('strictMultiSignCheck error.', { cause: [firstError.title, firstError.text].filter(Boolean).join(': ') });
    }
  }

  /**
   * @param {Object} handler
   * @param {DocumentEntity} document
   * @param {Object} status
   * @return {Promise<void>}
   */
  async updateOneRegisterRecord(handler, document, status) {
    const keyId = this.sandbox.evalWithArgs(handler.keyId, [document], { checkArrow: true });
    if (typeOf(keyId) !== 'number') {
      throw new InvalidSchemaError('keyId should be a number.');
    }
    const recordId = this.sandbox.evalWithArgs(handler.recordId, [document], {
      checkArrow: true,
      meta: { fn: 'updateOneRegisterRecord.recordId', documentId: document.id },
    });
    if (typeOf(recordId) !== 'string') {
      throw new InvalidSchemaError('recordId should be a string.');
    }

    const record = await this.registerService.findRecordById(recordId);

    const newRecordData = this.sandbox.evalWithArgs(handler.newRecordData, [{ currentRecordData: record.data, document, status }], {
      checkArrow: true,
      meta: { fn: 'newRecordData', documentId: document.id },
    });

    await this.registerService.updateRecordById(record.id, { ...record, data: newRecordData });
  }

  /**
   * @param {DocumentEntity} document
   * @return {Promise<void>}
   */
  async checkP7SSignaturesCount(document) {
    if (!global.config?.custom?.isCheckP7SSignaturesCount) {
      // Skip if checking is not enabled in config.
      return;
    }

    if (!document.task) {
      throw new Error('DocumentBusiness.checkP7SSignaturesCount. Invalid arguments.');
    }

    const { isP7sSign, signRequired } = document.documentTemplate.jsonSchema;

    if (!isP7sSign) {
      // Skip if P7S signature is not required.
      return;
    }

    let isSignRequired;
    if (typeOf(signRequired) === 'boolean') {
      isSignRequired = signRequired;
    } else if (typeOf(signRequired) === 'string' && signRequired.includes('=>')) {
      isSignRequired = this.sandbox.evalWithArgs(signRequired, [document.data, document.task.meta, document.task.activityLog], {
        meta: { fn: 'signRequired', documentId: document.id },
      });
    } else {
      isSignRequired = true;
    }

    if (!isSignRequired) {
      // Skip if signature is not required.
      return;
    }

    const mainPdfFileId = document.fileId;
    const attachmentsIds = await this.getAttachmentFilesLinks(document.id);
    const fileIds = [mainPdfFileId, ...attachmentsIds];

    const signersIds = document.task.signerUsers?.length ? document.task.signerUsers : document.task.performerUsers;
    const signersRNOKPP = (await this.auth.getUsersByIds(signersIds, true))?.map((v) => v.ipn);

    let totalCheckedSignaturesCount = 0;
    await Promise.all(
      fileIds.map(async (fileId) => {
        const { p7s } = (await this.storageService.provider.getP7sSignature(fileId, false)) || {};
        const signersRNOKPPFromSignature = await this.eds.getSignersRNOKPP(p7s);
        const isAllSignersSigned = signersRNOKPP.every((v) => signersRNOKPPFromSignature.includes(v));
        if (!isAllSignersSigned) {
          throw new Error(ERROR_NOT_ALL_FILES_ARE_SIGNED);
        }
        totalCheckedSignaturesCount++;
      }),
    );

    if (fileIds.length !== totalCheckedSignaturesCount) {
      throw new Error(ERROR_NOT_ALL_FILES_ARE_SIGNED);
    }
  }

  /**
   * @param {Array<Object>} additionalDataSignatures
   * @param {DocumentEntity} document
   * @param {string} userId
   * @return {Promise<void>}
   */
  async saveAdditionalDataSignatures(additionalDataSignatures, document, userId) {
    const promisesResults = await Promise.allSettled(
      additionalDataSignatures.map(async (item) => {
        if (typeOf(item.data) !== 'string' || typeOf(item.signature) !== 'string') {
          throw new InvalidParamsError('Required params data, signature.');
        }

        // Check if it is signed hash, and we need to replace hash by original data.
        if (item.isHashToInternalSignature === true) {
          try {
            item.signature = await this.eds.hashToInternalSignature(item.signature, Buffer.from(item.data, 'base64'));
          } catch (error) {
            log.save(
              'create-task-hash-to-internal-signature-error',
              {
                error: error.toString(),
                cause: error.cause,
                stack: error.stack,
              },
              'error',
            );
            throw error;
          }
        }

        return await models.additionalDataSignature.create({
          documentId: document.id,
          data: item.data,
          signature: item.signature,
          certificate: item.certificate ? item.certificate : '',
          cryptCertificate: item.cryptCertificate,
          createdBy: userId,
          meta: {
            isCreatedByOtherSystem: true,
          },
        });
      }),
    );

    promisesResults.forEach((value, index) => {
      if (value.status === 'rejected') {
        throw new Error(value.reason.toString(), {
          cause: {
            additionalDataSignature: Helpers.cutLongStrings(additionalDataSignatures[index], 50),
          },
        });
      }
    });
  }

  /**
   * @param {Array<Object>} attachmentsSignatures
   * @param {DocumentEntity} document
   * @param {Object} userInfo
   * @return {Promise<void>}
   */
  async saveAttachmentsP7SSignatures(attachmentsSignatures, document, userInfo) {
    const promisesResults = await Promise.allSettled(
      attachmentsSignatures.map(async (item) => {
        let { name, contentType, fileContent, p7sSignature, isHashToInternalSignature } = item;

        if (!name || !contentType || !fileContent || !p7sSignature) {
          throw new Error('TaskBusiness.saveAttachmentsSignatures. Invalid attachment params.');
        }

        const fileContentBuffer = Buffer.from(fileContent, 'base64');

        // Check if it is signed hash, and we need to replace hash by original data.
        if (isHashToInternalSignature === true) {
          try {
            p7sSignature = await this.eds.hashToInternalSignature(p7sSignature, fileContentBuffer);
          } catch (error) {
            throw new Error(`TaskBusiness.saveAttachmentsSignatures. Cannot convert hash to internal signature. ${error.toString()}`, { cause: error });;
          }
        }

        // Upload file to file storage.
        const readableStream = new Readable();
        readableStream.push(fileContentBuffer);
        readableStream.push(null);
        const fileStorageFileInfo = await this.storageService.provider.uploadFileFromStream(
          readableStream,
          name,
          undefined,
          contentType,
          fileContentBuffer.length,
        );

        // Link file to document as attachment.
        const documentAttachmentModelResponse = await this.documentAttachmentModel.create({
          documentId: document.id,
          name: fileStorageFileInfo.name,
          type: fileStorageFileInfo.contentType,
          size: fileStorageFileInfo.contentLength,
          link: fileStorageFileInfo.id,
          meta: {
            isCreatedByOtherSystem: true,
          },
        });

        // Upload file P7S signature to file storage.
        await this.storageService.provider.addP7sSignature(fileStorageFileInfo.id, p7sSignature, userInfo);

        const signatureInfo = await this.eds.getSignatureInfo(p7sSignature);
        const certificate = Buffer.from(signatureInfo.pem, SIGNATURE_ENCODING);

        documentAttachmentModelResponse.signatureInfo = {
          documentId: document.id,
          signature: p7sSignature,
          certificate,
          createdBy: userInfo.userId || userInfo,
        };

        return {
          documentAttachment: documentAttachmentModelResponse,
        };
      }),
    );

    promisesResults.forEach((value, index) => {
      if (value.status === 'rejected') {
        throw new Error(value.reason.toString(), {
          cause: {
            attachmentsSignatures: Helpers.cutLongStrings(attachmentsSignatures[index], 50),
          },
        });
      }
    });
    return promisesResults.map(({ value }) => value.documentAttachment);
  }

  /**
   * Is document path to array.
   * @param {string} path Document path.
   * @returns {boolean} As document path to array indicator.
   */
  isDocumentPathToArray(path) {
    // Check.
    if (typeof path !== 'string') {
      return;
    }

    // Define if last key is a number (path to array).
    const [lastKey] = path.split('.').reverse();
    const isLastKeyNumber = lastKey == parseInt(lastKey);
    return isLastKeyNumber;
  }

  /**
   * Sleep function.
   * @param {number} ms.
   */
  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * @param {object}
   */
  addCalculatedDataToUpdateLogs(obj) {
    try {
      if (obj?.document?.calculatedGetters?.length > 0 && obj?.updateLogs?.length > 0) {
        for (let i = 0; i < obj.document.calculatedGetters.length; i++) {
          const path = obj.document.calculatedGetters[i];
          const value = getValueByPath(obj.document.data, path);

          obj.updateLogs[0].changes.push({
            path: path,
            value: value !== undefined ? value : null,
          });
        }
      }

      return obj.updateLogs;

      function getValueByPath(obj, path) {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
      }
    } catch (error) {
      log.save('addCalculatedDataToUpdateLogs', error, 'error');
    }
  }
}

module.exports = DocumentBusiness;

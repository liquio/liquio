import crypto from 'node:crypto';
import { Readable } from 'node:stream';

import axios from 'axios';

import { ERROR_DOCUMENT_ALREADY_COMMITTED, ERROR_DOCUMENT_NOT_FOUND, ERROR_DOCUMENT_TEMPLATE_NOT_FOUND } from '../../constants/error';
import {
  BadRequestError,
  EvaluateSchemaFunctionError,
  ForbiddenError,
  InvalidParamsError,
  InvalidSchemaError,
  NotFoundError,
} from '../../lib/errors';
import { Helpers } from '../../lib/helpers';
import { JSONPath } from '../../lib/jsonpath';
import { Stream } from '../../lib/stream';
import typeOf from '../../lib/type_of';
import { DocumentEntity } from '../../entities/document';
import { Business } from '../business';
import type { DocumentBusiness } from './index';

// Constants.
const SIGNATURE_ENCODING = 'utf8';
const LETTER_FOR_SIGNERS_TEMPLATE_ID = 2;
const HIDE_REPLACEMENT_TEXT = '*****';
const SIGNATURE_TYPE_DATA = 'data';
const SIGNATURE_TYPE_DATA_EXTERNAL = 'dataExternal';
const SIGNATURE_TYPE_HASH = 'hash';
const SIGNATURE_TYPE_TAX_SIGN_ENCRYPT_SIGN = 'taxSignEncryptSign';

const ERROR_GET_DATA_FOR_SIGN = "Can't get data for sign.";
const ERROR_WRONG_SIGNED_RECORDS_COUNT = 'Wrong signed records count.';
const ERROR_DEFINE_SIGNATURE_INFO = "Can't define signature info.";
const ERROR_SIGNED_CONTENT_NOT_MATCH = 'Signed content not match needed.';
const ERROR_NOT_ALL_FILES_ARE_SIGNED = 'Not all files are signed (P7S).';

/**
 * Document signing business - signature/P7S flows, multisign coordination, and the
 * encryption blocks used for additional-data signatures. Extracted from the former
 * monolithic `DocumentBusiness` (see `document/index.ts`).
 */
export class DocumentSigningBusiness extends Business {
  constructor(
    config: any,
    private host: DocumentBusiness,
  ) {
    super(config);
  }

  /**
   * Get for sign by user.
   * @param userId User ID.
   */
  async getForSignByUser(userId: string): Promise<DocumentEntity[]> {
    return await (global.models.document as any).getForSignByUser(userId);
  }

  /**
   * Check ASIC manifest files.
   * @param asicInfo ASIC info.
   * @param filesIds Files IDs to compare.
   * @returns The same ASIC manifest files indicator.
   */
  checkAsicManifestFiles(asicInfo: { asicmanifestFileId: string; filesIds: string[] }, filesIds: string[]): boolean {
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
   * @param documentId Document ID.
   */
  async getDataForSign(documentId: string): Promise<Array<{ fileId: string; dataForSign: string }>> {
    try {
      // Get document.
      const document: any = await global.models.document.findById(documentId);
      if (!document) {
        throw new Error(ERROR_GET_DATA_FOR_SIGN);
      }

      // Get document generated static file hash.
      const staticFileId = document.fileId;
      const staticFileInfo = staticFileId && (await this.host.storageService.provider.getFileInfo(staticFileId));
      if (!staticFileInfo) {
        throw new NotFoundError('Main PDF file not found.');
      }
      const staticFileHash = {
        fileId: staticFileId,
        dataForSign: this.host.toBase64(staticFileInfo && (staticFileInfo.hash.sha256 || staticFileInfo.hash.sha1), 'hex'),
      };

      // Get document attachments files hashes.
      const {
        jsonSchema: { filterAttachmentToSign: filterAttachmentToSignFunction },
      } = await global.models.documentTemplate.findById(document.documentTemplateId);

      const filterAttachmentToSign = this.host.sandbox.eval(filterAttachmentToSignFunction) || (() => true);

      const attachments = await global.models.documentAttachment.getByDocumentId(documentId);
      const attachmentInfos = [];
      for (const attachment of attachments) {
        const attachmentFileInfo = await this.host.storageService.provider.getFileInfo(attachment.link);
        attachmentInfos.push(attachmentFileInfo);
      }

      const filteredAttachments = attachmentInfos.filter(filterAttachmentToSign);

      const attachmentsFilesHashes = filteredAttachments.map((attachmentFileInfo) => ({
        fileId: attachmentFileInfo.id,
        dataForSign: this.host.toBase64(attachmentFileInfo.hash.sha256 || attachmentFileInfo.hash.sha1, 'hex'),
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
        const generatedAsicManifest = await this.host.storageService.provider.createAsicManifest(filesIds, data);
        asicmanifestFileId = generatedAsicManifest.id;

        // Save ASIC info.
        await global.models.document.setAsicInfo(documentId, { asicmanifestFileId, filesIds });
      }

      // Get ASIC manifest content.
      const asicManifestP7sRequestOptions = await this.host.storageService.provider.getP7sSignatureRequestOptions(asicmanifestFileId, true);
      const asicManifestRequestOptions = await this.host.storageService.provider.downloadFileRequestOptions(asicmanifestFileId);
      let asicmanifestContent;
      try {
        asicmanifestContent = (await axios(asicManifestP7sRequestOptions)).data;
      } catch (error) {
        global.log.save(
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
        dataForSign: this.host.toBase64(asicmanifestContent),
      };

      return [asicManifestHash, ...filesHashes];
    } catch (error) {
      global.log.save('try-to-get-asic-manifest-error', { message: error.message, stack: error.stack }, 'error');
      const wrappedError = new Error(ERROR_GET_DATA_FOR_SIGN);
      (wrappedError as any).cause = error;
      throw wrappedError;
    }
  }

  /**
   * Sign.
   * @param documentId Document ID.
   * @param signature Signature(s) - a single signature, or a list (one per file returned by
   * {@link getDataForSign}).
   * @param userId User ID.
   * @param isUserPemCouldBeMock Is user sign pem could be mock indicator.
   * @param isUserSignatureCouldBeMock Is user sign could be mock indicator.
   * @param userInfo User info from ID.
   * @param sendLetterToSignerContext Send letter to signer context.
   * @param type Signature type.
   * @returns Signed document promise.
   */
  async sign(
    documentId: string,
    signature: string | string[],
    userId: string,
    isUserPemCouldBeMock: boolean,
    isUserSignatureCouldBeMock: boolean,
    userInfo: any,
    sendLetterToSignerContext: any,
    type: string,
  ): Promise<any> {
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

    const isUserAlreadySigned = !!(await (global.models.documentSignature.getByDocumentId as any)(documentId, userId))?.length;
    if (isUserAlreadySigned) {
      global.models.workflowError.create({
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
    const signatures = []; // Initialize signatures array for tracking processed signatures
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
          if (this.host.eds.provider.constructor.name === 'Pkcs7EdsProvider' || this.host.eds.provider.constructor.name === 'pkcs7') {
            global.log.save('document-sign-using-pkcs7-path', 'Using PKCS7 detached signature path', 'info');

            signatureInfo = await this.host.eds.getSignatureInfo(signatureRecord, dataForSignRecord);
          } else {
            global.log.save('document-sign-using-attached-path', 'Using attached signature path', 'info');
            signatureInfo = await this.host.eds.getSignatureInfo(signatureRecord);
          }
        } else {
          if (this.host.eds.provider.constructor.name === 'Pkcs7EdsProvider' || this.host.eds.provider.constructor.name === 'pkcs7') {
            global.log.save(
              'document-sign-subsequent-pkcs7',
              {
                signatureIndex: i,
                message: 'Processing subsequent signature with PKCS7 provider',
              },
              'info',
            );
            signatureInfo = await this.host.eds.getSignatureInfo(signatureRecord, dataForSignRecord);
          } else {
            signatureInfo = await this.host.eds.getSignatureInfo(signatureRecord, dataForSignRecord);
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
          throw new Error("Can't define signed content.");
        }

        // Check signature.
        if (contentString !== dataForSignRecord && i === 0) {
          const error: any = new Error(ERROR_SIGNED_CONTENT_NOT_MATCH);
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
              const savedToFilestorageP7sSignature = await this.host.storageService.provider.addP7sSignature(fileId, signatureRecord);
              global.log.save('save-p7s-signature-to-filestorage-result', {
                savedToFilestorageP7sSignature: {
                  ...(savedToFilestorageP7sSignature || {}),
                  p7s: HIDE_REPLACEMENT_TEXT,
                },
              });
            }

            // Save other files.
            const savedToFilestorageSignature = await this.host.storageService.provider.addSignature(
              fileId,
              dataForSignRecord,
              signatureRecord,
              pem,
              {
                type,
              },
            );
            global.log.save('save-signature-to-filestorage-result', {
              savedToFilestorageSignature: {
                ...(savedToFilestorageSignature || {}),
                signature: HIDE_REPLACEMENT_TEXT,
              },
            });
          } catch (error) {
            global.log.save(
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
    const isSigned = await global.models.documentSignature.create({
      documentId,
      createdBy: userId,
      signature: signatureBuffer || mockSignatureBufferIfNeedIt,
      type,
      certificate: pemBuffer || mockPemBufferIfNeedIt,
    });
    if (!isSigned) {
      throw new Error("Can't sign document.");
    }

    // Get signed document.
    const signedDocument: any = await global.models.document.findById(documentId);
    if (!signedDocument) {
      throw new Error("Can't get signed document.");
    }

    // Add multiSignInfo.
    await this.addMultiSignInfo(signedDocument.task, { userInfo, type: 'sign' });

    // Append signatures info.
    const documentSignatures = await (global.models.documentSignature.getByDocumentId as any)(documentId);
    const documentSignatureRejections = await (global.models.documentSignatureRejection.getByDocumentId as any)(documentId);
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
   * @param signedDocument Signed document.
   * @param inform Inform task performer if min signatures limit raised.
   * @param sendLetterToSignerContext Send letter to signer context.
   * @returns Min signatures limit info, or `null` if multisigners/a min limit aren't configured.
   */
  async handleMinSignaturesLimit(
    signedDocument: any,
    inform = false,
    sendLetterToSignerContext?: any,
  ): Promise<{
    minSignaturesLimit: number;
    signaturesCurrentPercent: number;
    signaturesCount: number;
    signerUsersCount: number;
    isMinSignaturesLimitRaised: boolean;
  } | null> {
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
      global.log.save('sign-document-get-multisigner-control-error', error, 'error');
      throw error;
    }
    if (!multisignerControl) {
      throw new NotFoundError("Can't find multisigner control.");
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
    const minSignaturesLimitInfo = {
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
   * @param documentId Document ID.
   * @param attachmentId Attachment ID.
   * @param userId User ID.
   */
  async getDataForSignP7s(documentId: string, attachmentId: string, userId: string): Promise<{ p7s: any; fileLink: string; fileName: string }> {
    // Get document file link.
    const document: any = await global.models.document.findById(documentId);
    if (!document) {
      throw new Error(ERROR_GET_DATA_FOR_SIGN);
    }
    const documentFileLink = document.fileId;
    const documentFileName = document.fileName;

    // Get attachment file link.
    let attachmentFileLink;
    let attachmentFileName;
    if (attachmentId) {
      const attachmentFileLinkAndName: any = await this.host.files.getAttachmentFileLink(documentId, attachmentId, true);
      attachmentFileLink = attachmentFileLinkAndName.fileLink;
      attachmentFileName = attachmentFileLinkAndName.fileName;
    }

    // Define file link.
    const fileLink = attachmentFileLink || documentFileLink;
    const fileName = attachmentFileName || documentFileName;

    // Try to get P7S.
    const p7sSignature = await this.host.storageService.provider.getP7sSignature(fileLink, false, userId);
    const { p7s: p7sBase64 } = p7sSignature || {};
    if (p7sBase64) {
      // Return the attachment P7S signature for multi signing possibility.
      const p7sBuffer = Buffer.from(p7sBase64, 'base64');
      return { p7s: p7sBuffer, fileLink, fileName };
    }

    // Get file in other cases.
    const fileReadableStream = await this.host.storageService.provider.downloadFile(fileLink);
    return { p7s: fileReadableStream, fileLink, fileName };
  }

  /**
   * Sign P7S.
   * @param documentId Document ID.
   * @param attachmentId Attachment ID.
   * @param p7sSignature P7S signature.
   * @param isUserSignatureCouldBeMock Is user sign could be mock indicator.
   * @param userInfo User info from ID.
   */
  async signP7s(
    documentId: string,
    attachmentId: string,
    p7sSignature: string,
    isUserSignatureCouldBeMock: boolean,
    userInfo: any,
    isExternalP7sSign = false,
  ): Promise<{ isP7sSigned: boolean }> {
    // Get data for sign P7S.
    const dataForSignP7s = await this.getDataForSignP7s(documentId, attachmentId, userInfo.userId);
    const { p7s, fileLink } = dataForSignP7s;

    // Set equal (can be buffer).
    let dataForSignBuffer = p7s;

    // Read stream to buffer if not a buffer.
    if (!Buffer.isBuffer(p7s)) {
      const p7sContent = [];
      p7s.on('data', (chunk) => p7sContent.push(chunk));
      await Stream.waitEndEvent(p7s);
      dataForSignBuffer = Buffer.concat(p7sContent);
    }

    // Check P7S signature (if could not be mock).
    if (!isUserSignatureCouldBeMock) {
      // Get signature info.
      const signatureInfo = await this.host.eds.getSignatureInfo(p7sSignature, undefined, isExternalP7sSign, dataForSignBuffer);
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
        const savedToFilestorageSignature = await this.host.storageService.provider.addP7sSignature(fileLink, p7sSignature, userInfo);
        global.log.save('save-p7s-signature-to-filestorage-result', {
          savedToFilestorageSignature: {
            ...(savedToFilestorageSignature || {}),
            p7s: HIDE_REPLACEMENT_TEXT,
          },
        });
      } catch (error) {
        global.log.save(
          'save-p7s-signature-to-filestorage-error',
          {
            error: error && error.message,
            fileLink,
            p7sSignature,
            pem,
          },
          'error',
        );

        const wrappedError = new Error("Can't save p7s signature.");
        (wrappedError as any).cause = error;
        throw wrappedError;
      }
    }

    // Return P7S signature result.
    const p7sSignatureResult = { isP7sSigned: true };
    return p7sSignatureResult;
  }

  /**
   * Sign additional P7S.
   * @param documentId Document ID.
   * @param p7sSignatureList P7S signature list.
   * @param isUserSignatureCouldBeMock Is user sign could be mock indicator.
   * @param userInfo User info from ID.
   * @param cryptCertificate Crypt certificate.
   */
  async signAdditionalP7s(
    documentId: string,
    p7sSignatureList: any[],
    isUserSignatureCouldBeMock: boolean,
    userInfo: any,
    cryptCertificate: string,
  ): Promise<{ isAdditionalP7sSigned: boolean }> {
    const document: any = await global.models.document.findById(documentId);
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

    const existsSigns = await global.models.additionalDataSignature.model.count({
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
        const signatureInfo = await this.host.eds.getSignatureInfo(
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
          const error: any = new Error(ERROR_SIGNED_CONTENT_NOT_MATCH);
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
        const saveAdditionalSignatureResult = await (global.models.additionalDataSignature.create as any)({
          documentId,
          data: dataForSign,
          signature: p7sSignature,
          certificate: pem ? pem : '',
          cryptCertificate: cryptCertificate,
          createdBy: userId,
          meta: meta,
        });
        global.log.save('save-additional-p7s-signature-result', { saveAdditionalSignatureResult });
      } catch (error) {
        global.log.save(
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

        const wrappedError = new Error("Can't save additional p7s signature.");
        (wrappedError as any).cause = error;
        throw wrappedError;
      }
    }

    // Return additional P7S signature result.
    const additionalP7sSignatureResult = { isAdditionalP7sSigned: true };
    return additionalP7sSignatureResult;
  }

  /**
   * Get additional data for sign P7S.
   * @param documentId Document ID.
   * @param withMeta With meta.
   * @param userInfo User info.
   * @returns Additional data for sign list promise - either base64 strings, or (when the source
   * item carried a `content`) `{ ...item, content: base64 }` objects; left as `any[]` rather than
   * modeled precisely.
   */
  async getAdditionalDataForSignP7s(documentId: string, withMeta = false, userInfo?: any): Promise<any[]> {
    // Get document.
    const document: any = await global.models.document.findById(documentId);
    if (!document) {
      throw new Error(ERROR_GET_DATA_FOR_SIGN);
    }

    const attachments = await global.models.documentAttachment.getByDocumentId(document.id);
    document.attachments = attachments;

    const { documentTemplateId } = document;

    // Get document template.
    const documentTemplate = await global.models.documentTemplate.findById(documentTemplateId);
    const { additionalDataToSign: additionalDataToSignFunction } = documentTemplate;

    // Return if no need to sign additional data.
    if (!additionalDataToSignFunction) {
      return [];
    }

    // Calc additional data to sign.
    let additionalDataToSign;
    try {
      const getFileHash = this.getFileHash.bind(this, document);
      const getFileBase64 = this.getFileBase64.bind(this);
      const getP7sSignature = this.getP7sSignature.bind(this);

      additionalDataToSign = await this.host.sandbox.evalWithArgs(additionalDataToSignFunction, [document, userInfo], {
        isAsync: true,
        global: {
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

      global.log.save('calc-additional-data-to-sign-error', {
        error: error && error.message,
        documentTemplateId,
        additionalDataToSignFunction,
        additionalDataToSign,
        document: documentString ?? document,
      });
      const wrappedError = new Error(ERROR_GET_DATA_FOR_SIGN);
      (wrappedError as any).cause = error;
      throw wrappedError;
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
   * @param document Document.
   * @param fileId File ID.
   */
  async getFileHash(document: any, fileId?: string): Promise<string | undefined> {
    const startTime = Date.now();

    const downloadFileRequestOptions = fileId
      ? await this.host.storageService.provider.downloadFileRequestOptions(fileId)
      : document.fileId && (await this.host.storageService.provider.downloadFileRequestOptions(document.fileId));
    if (!downloadFileRequestOptions) {
      global.log.save('get-file-hash-options-error', { fileId, time: Date.now() - startTime });
      return;
    }
    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'arraybuffer',
    });
    const file = Buffer.from(response.data);
    if (!file) {
      global.log.save('get-file-hash-download-error', { fileId, time: Date.now() - startTime });
      return;
    }

    const hash = this.getSha512Hash(file);

    global.log.save('get-file-hash-success', { fileId, hash, time: Date.now() - startTime });

    return hash;
  }

  /**
   * Get md5 hash.
   * @param data Data.
   */
  getMd5Hash(data: crypto.BinaryLike): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Get sha512 hash.
   * @param data Data.
   * @param options Options.
   * @param options.hmac HMAC secret.
   */
  getSha512Hash(data: crypto.BinaryLike, options?: { hmac?: string }): string {
    if (options?.hmac) {
      return crypto.createHmac('sha512', options.hmac).update(data).digest('hex');
    }
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  /**
   * Get file base64.
   * @param fileId File ID.
   */
  async getFileBase64(fileId: string): Promise<string | undefined> {
    const downloadFileRequestOptions = await this.host.storageService.provider.downloadFileRequestOptions(fileId);

    const response = await axios({
      ...downloadFileRequestOptions,
      responseType: 'arraybuffer',
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
   * @param fileId File ID.
   */
  async getP7sSignature(fileId: string): Promise<string | undefined> {
    const file = await this.host.storageService.provider.getP7sSignature(fileId);

    if (!file) {
      return;
    }

    return file.p7s;
  }

  /**
   * @param userInfo Authenticated user info (`ipn`, `edrpou`, name fields).
   * @param signatureInfo Signature/certificate info as returned by the EDS provider.
   */
  checkUserInfoMatchToSignatureInfo(userInfo: any, signatureInfo: any): void {
    if (!userInfo?.ipn) {
      throw new Error("User's ipn is empty.");
    }

    const signatureIPN = signatureInfo?.signer?.ipn?.DRFO;
    const signatureEDRPOU = signatureInfo?.signer?.ipn?.EDRPOU;

    // Handle case where certificate IPN could not be extracted
    if (signatureIPN === undefined || signatureIPN === null) {
      global.log.save(
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
      throw new Error("EDRPOU from sign certificate not match user's EDRPOU.");
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
      const error: any = new Error('Signed name not match needed.');
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
   * @param document Document.
   * @param user User info.
   * @param units Units.
   */
  async isSignAvailable(document: DocumentEntity, user: any, units: { all: any[]; head: any[]; member: any[] }): Promise<boolean> {
    // Define params.
    const { id: documentId, documentTemplateId } = document;

    // Get document JSON schema.
    const documentTemplate = await global.models.documentTemplate.findById(documentTemplateId);
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
      isSignAvailable = this.host.sandbox.evalWithArgs(isSignAvailableFunction, [document, user, units], {
        meta: { fn: 'isSignAvailable', documentId },
      });
      global.log.save('sign-available-function-result', { documentId, isSignAvailableFunction, isSignAvailable });
    } catch (error) {
      global.log.save('sign-available-function-error', { documentId, isSignAvailableFunction, error: error && error.message, document }, 'error');
      const wrappedError = new Error('Sign available function error.');
      (wrappedError as any).cause = error;
      throw wrappedError;
    }

    // Return is sign available indicator.
    return isSignAvailable;
  }

  /**
   * Is continue sign available.
   * @param document Document.
   * @param user User info.
   * @param units Units.
   */
  async isContinueSignAvailable(document: DocumentEntity, user: any, units: { all: any[]; head: any[]; member: any[] }): Promise<boolean> {
    // Define params.
    const { id: documentId, documentTemplateId } = document;

    // Get document JSON schema.
    const documentTemplate = await global.models.documentTemplate.findById(documentTemplateId);
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
      isContinueSignAvailable = this.host.sandbox.evalWithArgs(isContinueSignAvailableFunction, [document, user, units], {
        meta: { fn: 'isContinueSignAvailable', documentId },
      });
      global.log.save('continue-sign-available-function-result', { documentId, isContinueSignAvailableFunction, isContinueSignAvailable });
    } catch (error) {
      global.log.save(
        'continue-sign-available-function-error',
        {
          documentId,
          isContinueSignAvailableFunction,
          error: error && error.message,
          document,
        },
        'error',
      );
      const wrappedError = new Error('Continue sign available function error.');
      (wrappedError as any).cause = error;
      throw wrappedError;
    }

    // Return is sign available indicator.
    return isContinueSignAvailable;
  }

  /**
   * Decline multisigners.
   * @param signers Signers ids.
   * @param taskId Task Id.
   * @param documentId Document Id.
   * @param userId User Id.
   */
  async declineMultisigns(signers: string[], taskId: string, documentId: string, userId: string): Promise<void> {
    // Get document.
    const document: any = await global.models.document.findById(documentId);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    const documentSignatures = await (global.models.documentSignature.getByDocumentId as any)(documentId);
    const documentSignatureRejections = await (global.models.documentSignatureRejection.getByDocumentId as any)(documentId);
    document.signatures = documentSignatures;
    document.signatureRejections = documentSignatureRejections;
    const { documentTemplateId } = document;

    // Prepare letter to signers.
    let multisignerControl;
    try {
      multisignerControl = await this.getMultisignerControl(documentTemplateId);
    } catch (error) {
      global.log.save('decline-multisigns-get-multisigner-control-error', error, 'error');
      throw error;
    }
    if (!multisignerControl) {
      throw new Error("Can't find multisigner control.");
    }

    // Get signers data.
    let signersData;
    const privateProps = true;
    try {
      signersData = await this.host.auth.getUsersByIds(signers, privateProps);
    } catch (error) {
      global.log.save('decline-multisigns-get-users-info-error', error, 'error');
      const wrappedError = new Error(error.message);
      (wrappedError as any).cause = error;
      throw wrappedError;
    }

    const rejectSignLetterTemplateFormula = multisignerControl.rejectSignLetterTemplate;
    const rejectSignTitleFormula = multisignerControl.rejectSignLetterTitle;
    if (!rejectSignLetterTemplateFormula || !rejectSignTitleFormula) {
      throw new Error('Can not find sign rejection letter data.');
    }

    const dataForMail = signersData.map((v) => {
      const template =
        typeof rejectSignLetterTemplateFormula === 'string' &&
        this.host.sandbox.evalWithArgs(rejectSignLetterTemplateFormula, [document, v.firstName, v.lastName, v.middleName, v.ipn, v.email, userId], {
          checkArrow: true,
          meta: { fn: 'rejectSignLetterTemplate', documentId },
        });

      const title =
        typeof rejectSignTitleFormula === 'string' &&
        this.host.sandbox.evalWithArgs(rejectSignTitleFormula, [document], { checkArrow: true, meta: { fn: 'rejectSignLetterTitle', documentId } });

      return {
        userId: v.userId,
        email: v.email,
        template,
        title,
      };
    });

    // Send letter by user Ids.
    const sendLetterByUserIdsPromises = dataForMail.map((v) => this.host.notifier.sendToUser(v.userId, v.title, v.template));
    Promise.all(sendLetterByUserIdsPromises).catch((error) => {
      global.log.save('send-emails-to-signers-error', { error }, 'error');
      throw error;
    });
  }

  /**
   * Get mutlisigners control
   * @param templateId Template ID.
   */
  async getMultisignerControl(templateId: number): Promise<any> {
    // Get document JSON schema.
    const template = await global.models.documentTemplate.findById(templateId);
    if (!template) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const jsonSchema = template.jsonSchema;

    const controlName = this.config.multisigners && this.config.multisigners.schemaControl;
    // Find signers control.
    const multisignerControlArray = JSONPath(`$..[?(@.control === '${controlName}')]`, jsonSchema);
    if (!multisignerControlArray || multisignerControlArray.length > 1) {
      throw new Error("Can't find signers control.");
    }

    return multisignerControlArray[0];
  }

  /**
   * @param task Task.
   * @param document Document.
   */
  async checkSignersOrderAndGetNextSigner({ task, document }: { task: any; document: DocumentEntity }): Promise<string | void> {
    const multiSignControl = await this.getMultisignerControl(document.documentTemplateId);
    if (!multiSignControl?.isKeepSignersOrder) {
      return; // Skip, there is no strict multi sign functionality.
    }

    let isKeepSignersOrder;
    try {
      isKeepSignersOrder =
        typeOf(multiSignControl.isKeepSignersOrder) === 'boolean'
          ? multiSignControl.isKeepSignersOrder
          : this.host.sandbox.evalWithArgs(multiSignControl.isKeepSignersOrder, [{ document }], { checkArrow: true });
    } catch (error) {
      const wrappedError = new Error(`checkSignersOrderAndGetNextSigner. Evaluate multiSignControl.isKeepSignersOrder error. ${error?.toString()}`);
      (wrappedError as any).cause = error;
      throw wrappedError;
    }

    if (!isKeepSignersOrder) {
      return; // Skip, strict sequential sign rule disabled.
    }

    const signatures = await (global.models.documentSignature.getByDocumentId as any)(
      document.id,
      undefined,
      ['created_by'],
      [['created_at', 'asc']],
    );
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
   * @param task Task.
   * @param document Document.
   * @param nextSignerUserId Next signer's user ID.
   */
  async sendLetterToNextSigner({
    task,
    document,
    nextSignerUserId,
  }: {
    task: any;
    document: DocumentEntity;
    nextSignerUserId: string;
  }): Promise<void> {
    const multiSignControl = await this.getMultisignerControl(document.documentTemplateId);

    let userData;
    try {
      [userData] = await this.host.auth.getUsersByIds([nextSignerUserId], true);
    } catch (error) {
      const wrappedError = new Error(`sendLetterToNextSigner. Cannot get user data from ID. ${error?.toString()}`);
      (wrappedError as any).cause = error;
      throw wrappedError;
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
      letterTitle = this.host.sandbox.evalWithArgs(multiSignControl.letterTitle, [document], { checkArrow: true });
      const letterTemplateArgs = [document, firstName, lastName, middleName, ipn, email, signerUrl];
      letterTemplate = this.host.sandbox.evalWithArgs(multiSignControl.letterTemplate, letterTemplateArgs, { checkArrow: true });
    } catch (error) {
      const wrappedError = new Error(`sendLetterToNextSigner. Evaluate multiSignerControl.letterTitle/letterTemplate error. ${error?.toString()}`);
      (wrappedError as any).cause = error;
      throw wrappedError;
    }

    const templateId = multiSignControl.templateId || LETTER_FOR_SIGNERS_TEMPLATE_ID;

    await this.host.notifier.sendToUser([userId], letterTitle, letterTemplate, templateId);
  }

  /**
   * Send letter to signers.
   * @param document Document.
   * @param task Task.
   * @param signerIds Array with signers ID.
   * @param userId User ID.
   * @param isCancelSignsLetter Letter about signs cancelation indicator.
   * @param isSignaturesLimitRaised Is signature limit raised indicator.
   * @param isContinueSign Is continue sign.
   * @param appendPerformers Append performers to send
   */
  async sendLetterToSigners(
    document: any,
    task: any,
    signerIds: string[],
    userId: string,
    isCancelSignsLetter: boolean,
    isSignaturesLimitRaised?: boolean,
    isContinueSign?: boolean,
    appendPerformers = false,
  ): Promise<void> {
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
      global.log.save('sign-document-get-multisigner-control-error', error, 'error');
      throw error;
    }
    if (!multisignerControl || !multisignerSchemaPath) {
      throw new Error("Can't find multisigner control.");
    }

    const calcSignersFormula = multisignerControl.calcSigners;
    if (!calcSignersFormula || typeof calcSignersFormula !== 'string' || !calcSignersFormula.startsWith('(')) {
      global.log.save('multisigners-get-calculate-formula-error', { calcSignersFormula, taskId }, 'error');
      throw new Error('Can not find formula to calculate signers in JSON schema.');
    }

    // Calculate signers array.
    const signersArray = this.host.sandbox.evalWithArgs(calcSignersFormula, [document], { meta: { fn: 'calcSigners', documentId: document.id } });
    if (!signersArray) {
      global.log.save('multisigners-calculate-signers-by-formula-error', { taskId }, 'error');
      throw new Error("Can't calculate signers by formula.");
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
      signersData = await this.host.auth.getUsersByIds(signerNotPerformerIds, withPrivateProps);
    } catch (error) {
      global.log.save('send-letter-to-signers-error', error, 'error');
      const wrappedError = new Error(error.message);
      (wrappedError as any).cause = error;
      throw wrappedError;
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

    const dataForMail = signersData
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
          this.host.sandbox.evalWithArgs(
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
          this.host.sandbox.evalWithArgs(titleFormula, [document], { checkArrow: true, meta: { fn: 'titleFormula', documentId: document.id } });

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
    const sendLetterByUserIdsPromises = dataForMail.map((v) => this.host.notifier.sendToUser(v.userId, v.title, v.template, templateId));
    Promise.all(sendLetterByUserIdsPromises).catch((error) => {
      global.log.save('send-emails-to-signers-error', { error }, 'error');
      throw error;
    });

    // Send letter by user emails.
    const usersWithOtherEmails = dataForMail.filter((v) => v.otherEmail);
    const sendLetterByUserEmailsPromises = usersWithOtherEmails.map((v) => this.host.notifier.sendByEmails(v.email, v.title, v.template, templateId));
    Promise.all(sendLetterByUserEmailsPromises).catch((error) => {
      global.log.save('send-emails-to-signers-error', { error }, 'error');
      throw error;
    });

    return;
  }

  /**
   * Get data to encrypt.
   * @param documentId Document ID.
   * @param encryptionType Encryption type.
   */
  async getDataToEncrypt(documentId: string, encryptionType = 'taxClaim'): Promise<string[]> {
    // Get additional data signature (to encrypt).
    const additionalDataSignatureList = await global.models.additionalDataSignature.getByDocumentId(documentId);

    // Handle all additional data signature list to get data to encrypt.
    const toEncrypt = [];
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
   * @param documentId Document ID.
   * @param encryptedItems Encrypted data items.
   * @param encryptedDataCertificate Encrypted data certificate.
   */
  async saveEncryptedData(documentId: string, encryptedItems: string[], encryptedDataCertificate: string): Promise<void> {
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
   * Create block.
   * @private
   * @param name Name.
   * @param contentBuffer Content buffer.
   * @returns Block buffer.
   */
  createBlock(name: string, contentBuffer: Buffer): Buffer {
    const zeroSymbolBuffer = Buffer.alloc(1);
    const nameBuffer = Buffer.from(name);
    const contentSizeBuffer = Buffer.allocUnsafe(4);
    contentSizeBuffer.writeUInt32LE(Buffer.byteLength(contentBuffer));
    const blockBuffer = Buffer.concat([nameBuffer, zeroSymbolBuffer, contentSizeBuffer, contentBuffer]);
    return blockBuffer;
  }

  /**
   * Create UA1_SIGN block.
   * @private
   * @param p7sBuffer P7S buffer.
   * @returns UA1_SIGN block buffer promise.
   */
  createUa1signBlock(p7sBuffer: Buffer): Buffer {
    const ua1signBlockBuffer = this.createBlock('UA1_SIGN', p7sBuffer);
    return ua1signBlockBuffer;
  }

  /**
   * @param task Task.
   * @param actionParams Action params.
   * @param actionParams.userInfo User info.
   * @param actionParams.type Action type: 'sign' | 'reject' | 'delete_sign'.
   */
  async addMultiSignInfo(task: any, { userInfo, type }: { userInfo: any; type: 'sign' | 'reject' | 'delete_sign' }): Promise<void> {
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
    global.businesses.task.addTaskMetadata(task, userInfo.userId, false, metaObj);
  }

  /**
   * @param document Document.
   * @param userInfo User info.
   */
  async handleStrictMultiSignCheck(document: DocumentEntity, userInfo: any): Promise<void> {
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
          ? this.host.sandbox.evalWithArgs(isEnabled, [document.data], { meta: { fn: 'strictMultiSignCheck.isEnabled', documentId: document.id } })
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
              nonUserFilter = this.host.sandbox.evalWithArgs(options, [document.data], {
                meta: { fn: `strictMultiSignCheck.context[${index}].options`, documentId: document.id },
              });
            } catch (error) {
              throw new EvaluateSchemaFunctionError(`strictMultiSignCheck.context[${index}].options function throw error. $${error.toString()}`);
            }
            providerData = (await this.host.externalReader.getDataByUser(service, method, undefined, oauthToken, userInfo, nonUserFilter)).data;
          }
        }

        return { ...acc, [name]: providerData };
      },
      Promise.resolve({ user: userInfo }),
    );

    const errors = checkErrors.filter(({ check }, index) => {
      try {
        return this.host.sandbox.evalWithArgs(check, [document.data, context], {
          meta: { fn: `strictMultiSignCheck.errors[${index}].check`, documentId: document.id },
        });
      } catch (error) {
        throw new EvaluateSchemaFunctionError(`strictMultiSignCheck.errors[${index}].check function throw error. $${error.toString()}`);
      }
    });

    if (errors.length) {
      const [firstError] = errors;
      const wrappedError = new Error('strictMultiSignCheck error.');
      (wrappedError as any).cause = [firstError.title, firstError.text].filter(Boolean).join(': ');
      throw wrappedError;
    }
  }

  /**
   * @param document Document.
   */
  async checkP7SSignaturesCount(document: DocumentEntity): Promise<void> {
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
      isSignRequired = this.host.sandbox.evalWithArgs(signRequired, [document.data, document.task.meta, document.task.activityLog], {
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
    const attachmentsIds = await this.host.files.getAttachmentFilesLinks(document.id);
    const fileIds = [mainPdfFileId, ...attachmentsIds];

    const signersIds = document.task.signerUsers?.length ? document.task.signerUsers : document.task.performerUsers;
    const signersRNOKPP = (await this.host.auth.getUsersByIds(signersIds, true))?.map((v) => v.ipn);

    let totalCheckedSignaturesCount = 0;
    await Promise.all(
      fileIds.map(async (fileId) => {
        const { p7s } = (await this.host.storageService.provider.getP7sSignature(fileId, false)) || {};
        const signersRNOKPPFromSignature = await this.host.eds.getSignersRNOKPP(p7s);
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
   * @param additionalDataSignatures Additional data signatures.
   * @param document Document.
   * @param userId User ID.
   */
  async saveAdditionalDataSignatures(additionalDataSignatures: any[], document: DocumentEntity, userId: string): Promise<void> {
    const promisesResults = await Promise.allSettled(
      additionalDataSignatures.map(async (item) => {
        if (typeOf(item.data) !== 'string' || typeOf(item.signature) !== 'string') {
          throw new InvalidParamsError('Required params data, signature.');
        }

        // Check if it is signed hash, and we need to replace hash by original data.
        if (item.isHashToInternalSignature === true) {
          try {
            item.signature = await this.host.eds.hashToInternalSignature(item.signature, Buffer.from(item.data, 'base64'));
          } catch (error) {
            global.log.save(
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

        return await (global.models.additionalDataSignature.create as any)({
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
        const wrappedError = new Error(value.reason.toString());
        (wrappedError as any).cause = {
          additionalDataSignature: Helpers.cutLongStrings(additionalDataSignatures[index], 50),
        };
        throw wrappedError;
      }
    });
  }

  /**
   * @param attachmentsSignatures Attachment signatures.
   * @param document Document.
   * @param userInfo User info.
   * @returns The created document attachments (each with a `signatureInfo` side-channel attached).
   */
  async saveAttachmentsP7SSignatures(attachmentsSignatures: any[], document: DocumentEntity, userInfo: any): Promise<any[]> {
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
            p7sSignature = await this.host.eds.hashToInternalSignature(p7sSignature, fileContentBuffer);
          } catch (error) {
            const wrappedError = new Error(`TaskBusiness.saveAttachmentsSignatures. Cannot convert hash to internal signature. ${error.toString()}`);
            (wrappedError as any).cause = error;
            throw wrappedError;
          }
        }

        // Upload file to file storage.
        const readableStream = new Readable();
        readableStream.push(fileContentBuffer);
        readableStream.push(null);
        const fileStorageFileInfo = await this.host.storageService.provider.uploadFileFromStream(
          readableStream,
          name,
          undefined,
          contentType,
          fileContentBuffer.length,
        );

        // Link file to document as attachment.
        const documentAttachmentModelResponse = await this.host.documentAttachmentModel.create({
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
        await this.host.storageService.provider.addP7sSignature(fileStorageFileInfo.id, p7sSignature, userInfo);

        const signatureInfo = await this.host.eds.getSignatureInfo(p7sSignature);
        const certificate = Buffer.from(signatureInfo.pem, SIGNATURE_ENCODING);

        // `signatureInfo` is an ad-hoc side-channel property attached to the entity for the
        // caller to read (see this method's JSDoc), not a real DocumentAttachmentEntity field.
        (documentAttachmentModelResponse as any).signatureInfo = {
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
        const wrappedError = new Error(value.reason.toString());
        (wrappedError as any).cause = {
          attachmentsSignatures: Helpers.cutLongStrings(attachmentsSignatures[index], 50),
        };
        throw wrappedError;
      }
    });
    return promisesResults.map(({ value }: any) => value.documentAttachment);
  }
}

import flattening from 'flattening';
import _ from 'lodash';
import PropByPath from 'prop-by-path';

import { Sandbox } from '@liquio/back-core';

import {
  ERROR_DOCUMENT_ALREADY_COMMITTED,
  ERROR_DOCUMENT_NOT_FOUND,
  ERROR_DOCUMENT_TEMPLATE_NOT_FOUND,
  ERROR_UPDATE_DOCUMENT,
} from '../../constants/error';
import { DocumentEntity } from '../../entities/document';
import { BadRequestError, EvaluateSchemaFunctionError, ForbiddenError, InvalidSchemaError, NotFoundError } from '../../lib/errors';
import { DownloadToken } from '../../lib/download_token';
import { Eds } from '../../lib/eds';
import { ExternalReader } from '../../lib/external_reader';
import { NumberGenerator } from '../../lib/number_generator';
import typeOf from '../../lib/type_of';
import { DocumentAttachmentModel } from '../../models/document_attachment';
import { UnitModel } from '../../models/unit';
import { AuthService as Auth } from '../../services/auth';
import { DocumentFillerService as DocumentFiller } from '../../services/document_filler';
import { VerifiedUserInfoFiller } from '../../services/document_filler/fillers/verified_user_info';
import { DocumentValidatorService as DocumentValidator } from '../../services/document_validator';
import { Paths } from '../../services/document_validator/paths';
import { FileGeneratorService } from '../../services/file_generator';
import { NotifierService as Notifier } from '../../services/notifier';
import { PaymentService } from '../../services/payment';
import { RegisterService } from '../../services/register';
import { StorageService } from '../../services/storage';
import { Business } from '../business';
import { DocumentFileBusiness } from './files';
import { DocumentSigningBusiness } from './signing';
import { DocumentPaymentBusiness } from './payment';
import type { UserUnitIds } from './types';

// Constants.
const EMPTY_DOCUMENT_DATA = '{}';
const HIDE_REPLACEMENT_TEXT = '*****';
const ERROR_DOCUMENT_ACCESS = "User doesn't have any access to document.";

/**
 * Documents business - core document CRUD/access/register/external-reader operations live
 * directly on this class; signing, file/attachment/PDF, and payment concerns are split out
 * into {@link DocumentSigningBusiness} (`signing.ts`), {@link DocumentFileBusiness} (`files.ts`),
 * and {@link DocumentPaymentBusiness} (`payment.ts`) - reached via `global.businesses.document
 * .signing/.files/.payment.<method>(...)`.
 *
 * All shared services below are constructed once, here. `signing`/`files`/`payment` each receive
 * a reference to this instance (`host`) and read them as `this.host.<service>`, so a test stubbing
 * e.g. `documentBusiness.storageService = {...}` after construction is still seen by whichever
 * part uses it internally.
 */
export class DocumentBusiness extends Business {
  private static singleton: DocumentBusiness;

  // Public: read via `this.host.<service>` from DocumentSigningBusiness/DocumentFileBusiness/
  // DocumentPaymentBusiness (`signing.ts`/`files.ts`/`payment.ts`), so TS `private` isn't available
  // here - those are separate classes, not subclasses. `storageService` and `paymentService` are
  // also stubbed directly in tests (e.g. `documentBusiness.storageService = {...}`), and
  // `externalReader` is additionally read externally via `global.businesses.document.externalReader`
  // (`businesses/task.ts`).
  storageService: StorageService;
  eds: Eds;
  downloadToken: DownloadToken;
  paymentService: PaymentService;
  /** Typed `any`: `AuthService#provider` is itself declared `any` at its source, and the concrete
   * provider (e.g. `LiquioIdProvider`) exposes methods (`getUsersByIds`) not on the base `Provider`
   * class, so there is no shared type to reuse here without widening that base class too. */
  auth: any;
  notifier: Notifier;
  registerService: RegisterService;
  fileGeneratorService: FileGeneratorService;
  externalReader: ExternalReader;
  documentAttachmentModel: DocumentAttachmentModel;
  sandbox: Sandbox;

  // Private: only used by this class's own (merged-in general) methods - not read via `this.host.`
  // from any of the 3 split-out parts, and not referenced anywhere outside this file.
  // `documentFiller`/`numberGenerator` are never actually read anywhere at all (dead fields, kept
  // as-is - not this typing pass's job to remove them).
  private documentFiller: DocumentFiller;
  private verifiedUserInfoFiller: VerifiedUserInfoFiller;
  private unitModel: UnitModel;
  private numberGenerator: NumberGenerator;

  signing: DocumentSigningBusiness;
  files: DocumentFileBusiness;
  payment: DocumentPaymentBusiness;

  /**
   * Document business constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
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
      this.sandbox = new Sandbox({});

      this.files = new DocumentFileBusiness(config, this);
      this.signing = new DocumentSigningBusiness(config, this);
      this.payment = new DocumentPaymentBusiness(config, this);

      DocumentBusiness.singleton = this;
    }
    return DocumentBusiness.singleton;
  }

  /**
   * Find by ID and check acess.
   * @param documentId Document ID.
   * @param userId User ID.
   * @param userUnitIds User units IDs.
   * @param strict Strict indicator. Signers do not have access if equals `true`.
   * @param doNotCheckAccess Do not check access.
   */
  async findByIdAndCheckAccess(
    documentId: string,
    userId: string,
    userUnitIds: UserUnitIds,
    strict = false,
    doNotCheckAccess = false,
  ): Promise<DocumentEntity> {
    const document: any = await global.models.document.findById(documentId, false, true);
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
      const hasAccessByInbox = await global.models.userInbox.getByUserIdAndDocumentId(userId, documentId);
      if (!hasAccessByInbox) {
        throw new ForbiddenError(ERROR_DOCUMENT_ACCESS);
      }
    }

    // Get and return document.
    const documentSignatures = await (global.models.documentSignature.getByDocumentId as any)(documentId);
    const documentSignatureRejections = await (global.models.documentSignatureRejection.getByDocumentId as any)(documentId);
    document.signatures = documentSignatures;
    document.signatureRejections = documentSignatureRejections;
    return document;
  }

  /**
   * Find by ID and check acess.
   * @param workflowId Workflow ID.
   * @param taskTemplateId Task template ID.
   * @param userId User ID.
   * @param userUnitIds User units IDs.
   * @param strict Strict indicator. Signers do not have access if equals `true`.
   */
  async findByWorkflowIdAndCheckAccess(
    workflowId: string,
    taskTemplateId: number,
    userId: string,
    userUnitIds: UserUnitIds,
    strict = false,
  ): Promise<DocumentEntity> {
    // Get document by workflowId and taskTemplateId.
    const documentId = await global.models.task.findDocumentIdByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId);

    // Check access and get document.
    let document;
    try {
      document = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, strict);
    } catch (error) {
      const wrappedError = new Error(error.message);
      (wrappedError as any).cause = error;
      throw wrappedError;
    }
    return document;
  }

  /**
   * Update.
   * @param documentId Document ID.
   * @param properties Properties as [{ someKey: 'someValue' }].
   * @param userId User ID.
   * @param userUnitIds User units IDs.
   * @param isFromSystemTask
   * @param isKeepDocumentFile
   * @returns Updated document entity promise.
   */
  async update(
    documentId: string,
    properties: Array<{ path: string; value?: any; previousValue?: any }>,
    userId: string,
    userUnitIds: UserUnitIds,
    isFromSystemTask: boolean,
    isKeepDocumentFile = false,
  ): Promise<DocumentEntity> {
    // Get document.
    const document: any = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    if (document.isFinal === true) {
      throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
    }

    // Check if document has signers.
    const documentSignatures = await (global.models.documentSignature.getByDocumentId as any)(documentId);
    if (documentSignatures && documentSignatures.length > 0) {
      throw new Error("Can't update - document contains signatures.");
    }

    // Get JSON schema.
    const templateId = document.documentTemplateId;
    const template = await global.models.documentTemplate.findById(templateId);
    if (!template) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const jsonSchema = template.jsonSchema;

    // Remove readonly params.
    const documentValidator = new (DocumentValidator as any)(jsonSchema);
    const existingDocumentData = document.data;
    const documentDataObject = existingDocumentData || EMPTY_DOCUMENT_DATA;
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
    const documentUpdated = await global.models.document.updateData(documentId, userId, documentDataObject, true, isKeepDocumentFile);
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
   * @param properties Properties.
   * @param document Document.
   * @param jsonSchema JSON schems.
   */
  checkArrayElements(properties: Array<{ path: string; value?: any }>, document: any, jsonSchema: any): void {
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
   * @param object Object.
   * @param path Path.
   */
  ensureArraysInPath(object: Record<string, any>, path: string): void {
    const pathArray = path.split('.');
    let currentPosition = object;

    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      const nextKey = pathArray[i + 1];

      // If currentPosition[key] is an object, then nextKey is object key, represented as number.
      // Ex. multisign.signature.0.161011 (161011 is object key).
      // Ex. multisign.headsignature.111111 (111111 is object key).
      const isNextKeyObjectKey = typeof currentPosition[key] === 'object';

      // Determine if the current key should map to an object or array.
      const shouldBeObject = key === 'propertiesHasOptions' || !!currentPosition[key]?.propertiesHasOptions;
      const isNextKeyNumeric = !isNaN(Number(nextKey));

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
  async updateByExternalService(
    documentId: string,
    documentDataObject: any,
    externalServiceUser: string,
    doNotCheckAccess = false,
  ): Promise<DocumentEntity> {
    // Get document.
    const document: any = await this.findByIdAndCheckAccess(documentId, externalServiceUser, undefined, undefined, doNotCheckAccess);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Check document is final.
    if (document.isFinal === true) {
      global.log.save('update-by-external-service|document-already-committed-error', { documentId, externalServiceUser });
      throw new BadRequestError(ERROR_DOCUMENT_ALREADY_COMMITTED);
    }

    // Update document.
    const documentUpdated = await global.models.document.updateData(documentId, externalServiceUser, documentDataObject);
    if (!documentUpdated) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }

    // Return updated document.
    return documentUpdated;
  }

  /**
   * Prepare.
   * @param documentId Document ID.
   * @param userId User ID.
   * @param userUnitIds User units IDs.
   */
  async prepare(documentId: string, userId: string, userUnitIds: UserUnitIds): Promise<void> {
    // Get document.
    const document: any = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
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
      global.log.save('prepare-document-remove-attachment', { attachmentId: missingId });
      await global.businesses.document.files.deleteAttachment(documentId, missingId, userId);
    }
  }

  /**
   * Validate.
   * @param documentId Document ID.
   * @param userInfo Authenticated user info (`userInfo.userId` is used for the access check).
   * @param userUnitIds User units IDs.
   * @param includesUnexpectedErrors Includes unexpected errors.
   */
  async validate(documentId: string, userInfo: any, userUnitIds: UserUnitIds, includesUnexpectedErrors?: boolean): Promise<boolean> {
    // Get document.
    const document: any = await this.findByIdAndCheckAccess(documentId, userInfo.userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Get JSON schema.
    const templateId = document.documentTemplateId;
    const template = await global.models.documentTemplate.findById(templateId);
    if (!template) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const jsonSchema = template.jsonSchema;

    // Validate document.
    const documentValidator = new DocumentValidator(
      jsonSchema,
      {
        getFilteredRecordsByKeyId: global.businesses.register.getFilteredRecordsByKeyId.bind(global.businesses.register),
        getFilteredRecordsByKeyIdArguments: {
          userUnitIds: userUnitIds,
        },
      },
      userInfo,
    );
    const validationErrors = await documentValidator.check(document.data, includesUnexpectedErrors);
    if (validationErrors.length > 0) {
      const error: any = new Error('Validation error.');
      error.details = validationErrors;
      throw error;
    }

    return true;
  }

  /**
   * Get document by workflow Id and task template Id
   * @param workflowId Workflow ID.
   * @param taskTemplateId Task template ID.
   */
  async getDocumentByWorkflowIdAndTaskTemplateId(workflowId: string, taskTemplateId: number): Promise<DocumentEntity> {
    // Define task and document entities.
    let taskAndDocumentEntities;
    try {
      taskAndDocumentEntities = await (global.models.task.findDocumentByWorkflowIdAndTaskTemplateId as any)(workflowId, taskTemplateId);
    } catch (error) {
      const wrappedError = new Error(error.message || String(error));
      (wrappedError as any).cause = error;
      throw wrappedError;
    }
    if (!taskAndDocumentEntities) {
      throw new Error("Can't find task or document entities.");
    }
    const { document } = taskAndDocumentEntities;

    return document;
  }

  /**
   * Get register readonly params.
   * @param properties Properties.
   * @param jsonSchema json schema.
   */
  getRegisterControlPath(properties: Array<{ path: string; value?: any }>, jsonSchema: any): string[] {
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
   * @param properties JSON schema paths with a register control (see {@link getRegisterControlPath}).
   * @param jsonSchema JSON schema.
   * @param documentDataObject Document data.
   */
  async checkUpdateRegisterProperties(properties: string[], jsonSchema: any, documentDataObject: any): Promise<void> {
    for (const property of properties) {
      const jsonSchemaValue = PropByPath.get(jsonSchema, property);
      const documentProperty = property.replace(/.properties./g, '.');
      const documentValue = PropByPath.get(documentDataObject, documentProperty);

      // Continue if we need to skip the register check.
      if (jsonSchemaValue && jsonSchemaValue.doNotRegisterCheck) {
        continue;
      }

      if (!documentValue || documentValue.length === 0 || Object.keys(documentValue).length === 0) {
        continue;
      }

      if (jsonSchemaValue.properties) {
        const documentRegisterData = [];
        for (const prop in jsonSchemaValue.properties) {
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
   * @param recordId record Id.
   * @param documentValue Document value.
   */
  async compareWithRegisterRecordData(recordId: string, documentValue: Record<string, any>): Promise<void> {
    // Do request to register.
    let record, key;
    try {
      record = await this.registerService.findRecordById(recordId);
      key = await this.registerService.findKeyById(record?.keyId);
    } catch (error) {
      global.log.save('check-update-register-properties-get-register-record-by-id-error', error, 'error');
      const errorToResponse: any = new Error('Try to update register properties with unknown data. Record by ID not found.');
      errorToResponse.details = { recordId, documentValue };
      throw errorToResponse;
    }
    const recordData = record && record.data;
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

        global.log.save('document-update|incorrect-register-record', {
          recordId,
          prop,
          recordDataProp: recordData[prop],
          documentValueProp: documentValue[prop],
        });
        const errorToResponse: any = new Error('Try to update register properties with unknown data.');
        errorToResponse.details = { recordId, prop, recordDataProp: recordData[prop], documentValueProp: documentValue[prop] };
        throw errorToResponse;
      }
    }

    return;
  }

  /**
   * Check and save data from external reader.
   * @param params Params.
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
  }: {
    oauthToken?: string;
    service: string;
    method: string;
    captchaPayload?: any;
    documentId: string;
    path: string;
    index?: number | number[];
    user?: any;
    userId: string;
    userUnitIds: UserUnitIds;
    enabledMocksHeader?: string;
  }): Promise<DocumentEntity> {
    // Get document.
    const document: any = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
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
    const documentTemplate = await global.models.documentTemplate.findById(document.documentTemplateId);
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

    const nonUserFilter: any = {};
    if (typeof externalReaderCheckProperty.filters !== 'undefined') {
      for (let [name, value] of Object.entries(externalReaderCheckProperty.filters) as any) {
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
    const extraParams: any = { documentId: document.id, deleteOldAttachmentsBeforeSave };

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

    global.log.save('check-and-save-data-from-external-reader-prepared-filter', {
      service,
      method,
      documentId,
      userId,
      path,
      nonUserFilter,
      extraParams,
    });

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
          const updatedDocument = await global.models.document.updateData(documentId, userId, documentDataObject);
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
          const wrappedError = new Error(
            `DocumentBusiness.checkAndSaveDataFromExternalReader. Cannot get old attachments info for rewriting. ${error.toString()}`,
          );
          (wrappedError as any).cause = error;
          throw wrappedError;
        }

        try {
          await Promise.all(attachments.map((v) => this.storageService.provider.deleteFile(v.link)));
        } catch (error) {
          // Do not throw error. This error should not block saving new attachments.
          global.log.save(
            'document-business|check-and-save-data-from-external-reader|delete-file-from-file-storage-error',
            { error: error.toString() },
            'warn',
          );
        }

        try {
          await Promise.all(attachments.map((v) => this.documentAttachmentModel.delete(v.id)));
        } catch (error) {
          const wrappedError = new Error(`DocumentBusiness.checkAndSaveDataFromExternalReader. Cannot delete old attachments. ${error.toString()}`);
          (wrappedError as any).cause = error;
          throw wrappedError;
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
      throw new Error("Can't get external reader check data.");
    }
    global.log.save('external-reader-check-data', { externalReaderResult });

    // Get current document data (maybe updated during External Reader handling).
    const documentToUpdate: any = await global.models.document.findById(documentId);
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

    const updatedDocument = await global.models.document.updateData(documentId, userId, documentDataToUpdate);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    global.log.save('updated-document-with-external-reader-check-data', { updatedDocument: { ...updatedDocument, data: HIDE_REPLACEMENT_TEXT } }); // Do not log large document.data.

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
            throw new InvalidSchemaError("externalReaderCheck.onResponse.startAutoCommitTimer. Invalid 'timer' value.");
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
   * @param documentId Document ID.
   * @param params Params.
   */
  async updateVerifiedUserInfo(
    documentId: string,
    {
      userId,
      oauthToken,
      userUnitIds,
      userInfo,
      enabledMocksHeader,
    }: { userId: string; oauthToken?: string; userUnitIds: UserUnitIds; userInfo?: any; enabledMocksHeader?: string },
  ): Promise<DocumentEntity> {
    // Get document.
    const document: any = await this.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
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
    const updatedDocument = await global.models.document.updateData(documentId, userId, documentData);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }

    return updatedDocument;
  }

  addCalculatedDataToUpdateLogs(obj: { document: DocumentEntity; updateLogs: Array<{ changes: Array<{ path: string; value: any }> }> }): any {
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

      function getValueByPath(obj: any, path: string) {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
      }
    } catch (error) {
      global.log.save('addCalculatedDataToUpdateLogs', error, 'error');
    }
  }

  /**
   * To Base64.
   * @param rawString RAW string.
   * @param rawStringEncoding RAW string encoding.
   */
  toBase64(rawString = '', rawStringEncoding: 'utf8' | 'hex' = 'utf8'): string {
    return Buffer.from(rawString, rawStringEncoding).toString('base64');
  }

  /**
   * Sleep function.
   * @param ms
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

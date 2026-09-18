import { Sandbox } from '@liquio/back-core';

import { Entity } from './entity';
import { DocumentTemplateEntity } from './document_template';
import { DocumentSignatureEntity } from './document_signature';
import { DocumentSignatureRejectionEntity } from './document_signature_rejection';
import { DocumentAttachmentEntity } from './document_attachment';

/** ASIC container info, as stored verbatim on the `documents.asic` JSON column. */
export interface DocumentAsic {
  asicmanifestFileId: string | null;
  filesIds: string[];
}

/**
 * Constructor input for {@link DocumentEntity} - also reused by `DocumentModel#prepareForModel`.
 * Not `task` (assigned externally, see that field's own comment).
 */
export interface DocumentEntityOptions {
  id: string;
  externalId?: string | null;
  parentId?: string | null;
  documentTemplateId?: number;
  documentStateId?: number;
  cancellationTypeId?: number | null;
  number?: string | null;
  isFinal?: boolean;
  ownerId?: string | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  data?: any;
  description?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  signatures?: DocumentSignatureEntity[];
  signatureRejections?: DocumentSignatureRejectionEntity[];
  asic: DocumentAsic;
  attachments?: DocumentAttachmentEntity[];
  documentTemplate?: DocumentTemplateEntity;
}

/**
 * Document entity.
 */
export class DocumentEntity extends Entity {
  task: any; // Assigned externally by models/document.js's prepareEntity.
  id: string;
  externalId: string | null;
  parentId: string | null;
  documentTemplateId: number;
  documentStateId: number;
  cancellationTypeId: number | null;
  number: string | null;
  isFinal: boolean;
  ownerId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Arbitrary JSON blob whose shape is entirely defined by the document's template (`jsonSchema`)
   * - deliberately left as `any` rather than `Record<string, unknown>`: business logic across the
   * codebase deep-destructures/optional-chains into this (e.g. `data.calculated.someField`), which
   * a `Record<string, unknown>` would reject at the first level down.
   */
  data: any;
  description: string | null;
  fileId: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  signatures: DocumentSignatureEntity[];
  signatureRejections: DocumentSignatureRejectionEntity[];
  asic: DocumentAsic;
  attachments: DocumentAttachmentEntity[];
  documentTemplate: DocumentTemplateEntity;
  calculatedGetters: string[];

  static sandbox = new Sandbox({});

  constructor({
    id,
    externalId,
    parentId,
    documentTemplateId,
    documentStateId,
    cancellationTypeId,
    number,
    isFinal,
    ownerId,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
    data,
    description,
    fileId,
    fileName,
    fileType,
    fileSize,
    signatures,
    signatureRejections,
    asic,
    attachments,
    documentTemplate,
  }: DocumentEntityOptions) {
    super();

    this.id = id;
    this.externalId = externalId;
    this.parentId = parentId;
    this.documentTemplateId = documentTemplateId;
    this.documentStateId = documentStateId;
    this.cancellationTypeId = cancellationTypeId;
    this.number = number;
    this.isFinal = isFinal;
    this.ownerId = ownerId;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.data = data;
    this.description = description;
    this.fileId = fileId;
    this.fileName = fileName;
    this.fileType = fileType;
    this.fileSize = fileSize;
    this.signatures = signatures;
    this.signatureRejections = signatureRejections;
    this.asic = asic;
    this.attachments = attachments;
    this.documentTemplate = documentTemplate;
    this.calculatedGetters = [];
  }

  getFilterProperties(): string[] {
    return [
      'id',
      'externalId',
      'parentId',
      'documentTemplateId',
      'documentStateId',
      'cancellationTypeId',
      'number',
      'isFinal',
      'ownerId',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt',
      'data',
      'description',
      'fileId',
      'fileName',
      'fileType',
      'fileSize',
      'signatures',
      'signatureRejections',
      'asic',
      'attachments',
      'calculatedGetters',
    ];
  }

  getFilterPropertiesBrief(): string[] {
    return [
      'id',
      'externalId',
      'parentId',
      'documentTemplateId',
      'documentStateId',
      'cancellationTypeId',
      'number',
      'isFinal',
      'ownerId',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt',
      'description',
      'fileid',
      'fileName',
      'fileType',
      'signatures',
      'signatureRejections',
      'asic',
      'attachments',
    ];
  }

  /**
   * Calc getters.
   * @throws {Error} Throws error if document template is not an instance of DocumentTemplateEntity.
   * @throws {Error} Throws error if getter function is not defined.
   */
  calcGetters() {
    // Check document template.
    if (!(this.documentTemplate instanceof DocumentTemplateEntity)) {
      throw new Error('Document template is not an instance of DocumentTemplateEntity.');
    }

    // Find getter control in document template.
    // Sample: `{ "control": "getter" }`.
    const { jsonSchema } = this.documentTemplate;
    if (jsonSchema.properties) {
      const stepNames = Object.keys(jsonSchema.properties);
      for (const stepName of stepNames) {
        const step = jsonSchema.properties[stepName];
        const controlNames = step.properties ? Object.keys(step.properties) : [];
        for (const controlName of controlNames) {
          const control = step.properties[controlName];
          if (control.control === 'getter') {
            // Get getter value.
            const getterCurrentValue = this.data[stepName] && this.data[stepName][controlName];
            const getterFunctionString = control.value;
            if (!getterFunctionString) {
              throw new Error(`Getter function is not defined for control ${stepName}.${controlName}.`);
            }
            const getterFunction = DocumentEntity.sandbox.eval(control.value);
            const stepData = this.data[stepName] || {};
            if (Object.keys(this.data).length > 0) {
              const getterValue = getterFunction(getterCurrentValue, stepData, this.data);

              // Set getter value.
              if (!this.data[stepName]) {
                this.data[stepName] = {};
              }
              this.data[stepName][controlName] = getterValue;
              this.calculatedGetters.push(`${stepName}.${controlName}`);
            }
          }
        }
      }
    }
  }
}

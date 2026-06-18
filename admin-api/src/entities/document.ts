import { type DocumentAttachmentEntity } from './document_attachment';
import { Entity } from './entity';

interface DocumentEntityOptions {
  /** ID. */
  id: string;
  /** External ID. */
  externalId?: string;
  /** Parent ID. */
  parentId: string;
  /** Document template ID. */
  documentTemplateId: number;
  /** Document state ID. */
  documentStateId: number;
  /** Cancellation type ID. */
  cancellationTypeId: number;
  /** Number. */
  number: number;
  /** Final status. */
  isFinal: boolean;
  /** Owner ID. */
  ownerId: string;
  /** Created by. */
  createdBy: string;
  /** Updated by. */
  updatedBy: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
  /** Data. */
  data: object;
  /** Description. */
  description: string;
  /** File ID. */
  fileId: string;
  /** File name. */
  fileName: string;
  /** File type. */
  fileType: string;
  /** Signatures. */
  signatures: object[];
  /** Signature rejections. */
  signatureRejections: object[];
  asic?: {
    asicmanifestFileId?: string;
    filesIds?: string[];
  };
  /** Attachments. */
  attachments?: DocumentAttachmentEntity[];
}

/**
 * Document entity.
 */
export class DocumentEntity extends Entity<DocumentEntityOptions> {
  getFilterProperties(): (keyof DocumentEntityOptions)[] {
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
      'signatures',
      'signatureRejections',
      'asic',
      'attachments',
    ];
  }

  getFilterPropertiesBrief(): (keyof DocumentEntityOptions)[] {
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
      'fileId',
      'fileName',
      'fileType',
      'signatures',
      'signatureRejections',
      'asic',
      'attachments',
    ];
  }
}

export interface DocumentEntity extends DocumentEntityOptions { }

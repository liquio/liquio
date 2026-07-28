import { Entity } from './entity';

interface DocumentSignatureEntityOptions {
  /** ID. */
  id: string;
  /** Document ID. */
  documentId: string;
  /** Signature. */
  signature: string;
  /** Certificate. */
  certificate: string;
  type: string;
  /** Created by. */
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document signature entity.
 */
export class DocumentSignatureEntity extends Entity<DocumentSignatureEntityOptions> {
  getFilterProperties(): (keyof DocumentSignatureEntityOptions)[] {
    return ['id', 'documentId', 'signature', 'certificate', 'type', 'createdBy', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief(): (keyof DocumentSignatureEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface DocumentSignatureEntity extends DocumentSignatureEntityOptions {}

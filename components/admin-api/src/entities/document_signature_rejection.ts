import { Entity } from './entity';

interface DocumentSignatureRejectionEntityOptions {
  /** ID. */
  id: string;
  /** Document ID. */
  documentId: string;
  /** User ID. */
  userId: string;
  /** Data. */
  data: object;
  /** Created at. */
  createdAt: Date;
  /** Created by. */
  createdBy: string;
}

/**
 * Document signature rejection entity.
 */
export class DocumentSignatureRejectionEntity extends Entity<DocumentSignatureRejectionEntityOptions> {
  /**
   * Get filter properties.
   */
  getFilterProperties(): (keyof DocumentSignatureRejectionEntityOptions)[] {
    return ['id', 'documentId', 'userId', 'data', 'createdAt', 'createdBy'];
  }

  /**
   * Get filter properties brief.
   */
  getFilterPropertiesBrief(): (keyof DocumentSignatureRejectionEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface DocumentSignatureRejectionEntity extends DocumentSignatureRejectionEntityOptions {}

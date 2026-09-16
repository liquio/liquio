import { Entity } from './entity';

/** Constructor input for {@link DocumentSignatureRejectionEntity} - also reused by `DocumentSignatureRejectionModel#prepareForModel`. */
export interface DocumentSignatureRejectionEntityOptions {
  id: string;
  documentId: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt?: Date;
  createdBy: string;
}

/**
 * Document signature rejection entity.
 */
export class DocumentSignatureRejectionEntity extends Entity {
  id: string;
  documentId: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: Date;
  createdBy: string;

  constructor({ id, documentId, userId, data, createdAt, createdBy }: DocumentSignatureRejectionEntityOptions) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.userId = userId;
    this.data = data;
    this.createdAt = createdAt;
    this.createdBy = createdBy;
  }

  /**
   * Get filter properties.
   */
  getFilterProperties(): string[] {
    return ['id', 'documentId', 'userId', 'data', 'createdAt', 'createdBy'];
  }

  /**
   * Get filter properties brief.
   */
  getFilterPropertiesBrief(): string[] {
    return this.getFilterProperties();
  }
}

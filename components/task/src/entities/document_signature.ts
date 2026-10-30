import { Entity } from './entity';

/** Constructor input for {@link DocumentSignatureEntity} - also reused by `DocumentSignatureModel#prepareForModel`. */
export interface DocumentSignatureEntityOptions {
  id: string;
  documentId: string;
  signature?: string | null;
  type?: string | null;
  certificate?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
}

/**
 * Document signature entity.
 */
export class DocumentSignatureEntity extends Entity {
  id: string;
  documentId: string;
  signature: string | null;
  type: string | null;
  certificate: string | null;
  createdBy: string | null;
  createdAt: Date;

  constructor({ id, documentId, signature, type, certificate, createdBy, createdAt }: DocumentSignatureEntityOptions) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.signature = signature;
    this.type = type;
    this.certificate = certificate;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
  }

  /**
   * Get filter properties.
   */
  getFilterProperties(): string[] {
    return ['id', 'documentId', 'signature', 'type', 'certificate', 'createdBy', 'createdAt'];
  }

  /**
   * Get filter properties brief.
   */
  getFilterPropertiesBrief(): string[] {
    return this.getFilterProperties();
  }
}

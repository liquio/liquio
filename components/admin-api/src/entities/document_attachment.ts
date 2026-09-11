import { Entity } from './entity';

interface DocumentAttachmentEntityOptions {
  /** ID. */
  id: string;
  /** Document ID. */
  documentId: string;
  /** Link. */
  link: string;
  /** Name. */
  name: string;
  /** Type. */
  type: string;
  /** Size. */
  size: number;
  /** Is generated. */
  isGenerated: boolean;
  /** Created at. */
  createdAt: Date;
}

/**
 * Document attachment entity.
 */
export class DocumentAttachmentEntity extends Entity<DocumentAttachmentEntityOptions> {
  getFilterProperties(): (keyof DocumentAttachmentEntityOptions)[] {
    return ['id', 'documentId', 'link', 'name', 'type', 'size', 'isGenerated', 'createdAt'];
  }

  getFilterPropertiesBrief(): (keyof DocumentAttachmentEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface DocumentAttachmentEntity extends DocumentAttachmentEntityOptions {}

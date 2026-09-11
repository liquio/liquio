import { Entity } from './entity';

/** Constructor input for {@link DocumentAttachmentEntity} - also reused by `DocumentAttachmentModel#prepareForModel`. */
export interface DocumentAttachmentEntityOptions {
  id: string;
  documentId: string;
  link?: string | null;
  name?: string | null;
  type?: string | null;
  size?: number | null;
  labels?: string[];
  isGenerated?: boolean;
  isSystem?: boolean;
  meta?: Record<string, unknown>;
  createdAt?: Date;
}

/**
 * Document attachment entity.
 */
export class DocumentAttachmentEntity extends Entity {
  id: string;
  documentId: string;
  link: string | null;
  name: string | null;
  type: string | null;
  size: number | null;
  labels: string[];
  isGenerated: boolean;
  isSystem: boolean;
  meta: Record<string, unknown>;
  createdAt: Date;

  constructor({ id, documentId, link, name, type, size, labels, isGenerated, isSystem, meta, createdAt }: DocumentAttachmentEntityOptions) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.link = link;
    this.name = name;
    this.type = type;
    this.size = size;
    this.labels = labels;
    this.isGenerated = isGenerated;
    this.isSystem = isSystem;
    this.meta = meta;
    this.createdAt = createdAt;
  }

  /**
   * Get placeholder.
   * @param fileId File ID.
   * @param dataPath Data path.
   */
  static getPlaceholder(fileId: string, dataPath: string) {
    return {
      isAttachmentPlaceholder: true,
      data: { fileId, dataPath },
    };
  }

  getFilterProperties() {
    return ['id', 'documentId', 'link', 'name', 'type', 'size', 'labels', 'isGenerated', 'isSystem', 'meta', 'createdAt'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

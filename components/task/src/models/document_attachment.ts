import Sequelize from 'sequelize';
import { Model } from './model';
import { DocumentAttachmentEntity, DocumentAttachmentEntityOptions } from '../entities/document_attachment';

/** Raw shape of a `document_attachments` row as Sequelize hands it back. */
export interface DocumentAttachmentRow {
  id: string;
  document_id: string;
  link?: string | null;
  name?: string | null;
  type?: string | null;
  size?: number | null;
  labels: string[];
  is_generated: boolean;
  is_system: boolean;
  meta: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateDocumentAttachmentParams {
  documentId: string;
  link: string;
  name: string;
  type: string;
  size?: number;
  labels?: string[];
  isGenerated?: boolean;
  isSystem?: boolean;
  meta?: Record<string, unknown>;
}

/**
 * Document attachment model.
 */
export class DocumentAttachmentModel extends Model {
  private static singleton: DocumentAttachmentModel;

  model: any;

  /**
   * Document attachment model constructor.
   */
  constructor() {
    if (!DocumentAttachmentModel.singleton) {
      super();

      this.model = this.db.define(
        'documentAttachment',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          document_id: {
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' },
          },
          link: Sequelize.STRING,
          name: Sequelize.STRING,
          type: Sequelize.STRING,
          size: Sequelize.INTEGER,
          labels: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: false,
            defaultValue: [],
          },
          is_generated: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          is_system: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          meta: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
        },
        {
          tableName: 'document_attachments',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      DocumentAttachmentModel.singleton = this;
    }

    return DocumentAttachmentModel.singleton;
  }

  /**
   * Find by ID.
   * @param id UUID.
   */
  async findById(id: string): Promise<DocumentAttachmentEntity | undefined> {
    const attachment = await this.model.findByPk(id);

    if (!attachment) {
      return;
    }

    return this.prepareEntity(attachment);
  }

  /**
   * Get by document ID.
   * @param documentId Document ID.
   * @returns Promise of document attachments list.
   */
  async getByDocumentId(documentId: string): Promise<DocumentAttachmentEntity[]> {
    // Get attachments RAW records from DB.
    const attachmentsRaw = await this.model.findAll({ where: { document_id: documentId } });

    // Define and return attachments entities.
    const attachments = attachmentsRaw.map(this.prepareEntity).sort((a, b) => +(a.id > b.id));
    return attachments;
  }

  /**
   * Get by document id and meta.
   * @param documentId Document ID.
   * @param meta Attachment meta property.
   * @returns Promise of document attachments list.
   */
  async getByDocumentIdAndMeta(documentId: string, meta: Record<string, unknown>): Promise<DocumentAttachmentEntity[]> {
    // Get attachments RAW records from DB.
    const attachmentsRaw = await this.model.findAll({ where: { document_id: documentId, meta: meta } });

    // Return attachments entities.
    return attachmentsRaw.map(this.prepareEntity).sort((a, b) => +(a.id > b.id));
  }

  /**
   * Get by document IDs.
   * @param documentIds Document IDs.
   * @returns Promise of document attachments list.
   */
  async getByDocumentIds(documentIds: string[]): Promise<DocumentAttachmentEntity[]> {
    // Get attachments RAW records from DB.
    const attachmentsRaw = await this.model.findAll({ where: { document_id: documentIds } });

    // Define and return attachments entities.
    const attachments = attachmentsRaw.map(this.prepareEntity).sort((a, b) => +(a.id > b.id));
    return attachments;
  }

  /**
   * Create attachment.
   */
  async create({
    documentId,
    link,
    name,
    type,
    size = 0,
    labels = [],
    isGenerated = false,
    isSystem = false,
    meta = {},
  }: CreateDocumentAttachmentParams): Promise<DocumentAttachmentEntity> {
    const attachment = this.prepareForModel({ documentId, link, name, type, size, labels, isGenerated, isSystem, meta });
    const rawDbResponse = await this.model.create(attachment);

    return this.prepareEntity(rawDbResponse);
  }

  /**
   * Delete attachment.
   * @param id UUID.
   */
  async delete(id: string) {
    const result = await this.model.destroy({ where: { id: id } });

    return result;
  }

  /**
   * Delete by document ID.
   * @param documentId Document ID.
   */
  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.model.destroy({ where: { document_id: documentId } });
  }

  /**
   * Delete generated by document ID.
   * @param documentId Document ID.
   */
  async deleteGeneratedByDocumentId(documentId: string): Promise<void> {
    await this.model.destroy({ where: { document_id: documentId, is_generated: true } });
  }

  /**
   * Prepare entity.
   * @param item Raw document attachment row.
   */
  prepareEntity(item: DocumentAttachmentRow): DocumentAttachmentEntity {
    return new DocumentAttachmentEntity({
      id: item.id,
      documentId: item.document_id,
      link: item.link,
      name: item.name,
      type: item.type,
      size: item.size,
      labels: item.labels,
      isGenerated: item.is_generated,
      isSystem: item.is_system,
      meta: item.meta,
      createdAt: item.created_at,
    });
  }

  /**
   * Prepare for model.
   * @param item Camel-cased entity-shaped fields to persist.
   */
  prepareForModel(item: Partial<DocumentAttachmentEntityOptions>): Partial<DocumentAttachmentRow> {
    return {
      document_id: item.documentId,
      link: item.link,
      name: item.name,
      type: item.type,
      size: item.size,
      labels: item.labels,
      is_generated: item.isGenerated,
      is_system: item.isSystem,
      meta: item.meta,
    };
  }
}

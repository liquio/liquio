import Sequelize from 'sequelize';
import { Model } from './model';
import { DocumentSignatureRejectionEntity, DocumentSignatureRejectionEntityOptions } from '../entities/document_signature_rejection';

/** Raw shape of a `document_signature_rejections` row as Sequelize hands it back. */
export interface DocumentSignatureRejectionRow {
  id: string;
  document_id: string;
  user_id: string;
  data: Record<string, unknown>;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateDocumentSignatureRejectionParams {
  documentId: string;
  userId: string;
  data: Record<string, unknown>;
  createdBy: string;
}

export class DocumentSignatureRejectionModel extends Model {
  private static singleton: DocumentSignatureRejectionModel;

  model: any;

  constructor() {
    // Singleton.
    if (!DocumentSignatureRejectionModel.singleton) {
      // Call parent constructor.
      super();

      // Define params.
      this.model = this.db.define(
        'documentSignatureRejection',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          document_id: {
            allowNull: false,
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' },
          },
          user_id: {
            allowNull: false,
            type: Sequelize.TEXT,
          },
          data: {
            allowNull: false,
            type: Sequelize.JSON,
          },
          created_by: {
            allowNull: false,
            type: Sequelize.STRING,
          },
        },
        {
          tableName: 'document_signature_rejections',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Init singleton.
      DocumentSignatureRejectionModel.singleton = this;
    }

    // Return singleton.
    return DocumentSignatureRejectionModel.singleton;
  }

  /**
   * Get by document ID.
   * @param documentId Document ID.
   * @returns Document signature rejections list promise.
   */
  async getByDocumentId(documentId: string): Promise<DocumentSignatureRejectionEntity[]> {
    // Get record.
    const documentSignatureRejections = await this.model.findAll({ where: { document_id: documentId } });

    // Convert to entities.
    const documentSignaturesEntities = documentSignatureRejections.map((item) => {
      return this.prepareEntity(item);
    });

    return documentSignaturesEntities;
  }

  /**
   * Create.
   * @returns Created document signature rejection entity promise.
   */
  async create({ documentId, userId, data, createdBy }: CreateDocumentSignatureRejectionParams): Promise<DocumentSignatureRejectionEntity> {
    // Prepare record.
    const signatureRejectionModel = this.prepareForModel({ documentId, userId, data, createdBy });

    // Create record.
    const createdSignatureRejection = await this.model.create(signatureRejectionModel);

    // Return entity.
    return this.prepareEntity(createdSignatureRejection);
  }

  /**
   * Delete by document ID and user ID.
   * @param documentId Document ID.
   * @param userId User ID.
   */
  async deleteByDocumentIdAndUserId(documentId: string, userId: string): Promise<void> {
    await this.model.destroy({ where: { document_id: documentId, user_id: userId } });
  }

  /**
   * Delete by document ID.
   * @param documentId Document ID.
   */
  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.model.destroy({ where: { document_id: documentId } });
  }

  /**
   * Prepare entity.
   * @param item Raw document signature rejection row.
   */
  prepareEntity(item: DocumentSignatureRejectionRow): DocumentSignatureRejectionEntity {
    return new DocumentSignatureRejectionEntity({
      id: item.id,
      documentId: item.document_id,
      userId: item.user_id,
      data: item.data,
      createdAt: item.created_at,
      createdBy: item.created_by,
    });
  }

  /**
   * Prepare for model.
   * @param item Camel-cased entity-shaped fields to persist.
   */
  prepareForModel(item: Partial<DocumentSignatureRejectionEntityOptions>): Partial<DocumentSignatureRejectionRow> {
    return {
      document_id: item.documentId,
      user_id: item.userId,
      data: item.data,
      created_at: item.createdAt,
      created_by: item.createdBy,
    };
  }
}

import Sequelize from 'sequelize';
import { Model } from './model';
import { DocumentSignatureEntity, DocumentSignatureEntityOptions } from '../entities/document_signature';

/** Raw shape of a `document_signatures` row as Sequelize hands it back. */
export interface DocumentSignatureRow {
  id: string;
  document_id: string;
  signature?: string | null;
  type?: string | null;
  certificate?: string | null;
  created_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateDocumentSignatureParams {
  documentId: string;
  signature: string;
  type: string;
  certificate: string;
  createdBy: string;
}

export class DocumentSignatureModel extends Model {
  private static singleton: DocumentSignatureModel;

  model: any;

  constructor() {
    if (!DocumentSignatureModel.singleton) {
      super();

      this.model = this.db.define(
        'documentSignature',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          document_id: {
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' },
          },
          signature: Sequelize.TEXT,
          type: Sequelize.STRING,
          certificate: Sequelize.TEXT,
          created_by: Sequelize.STRING,
        },
        {
          tableName: 'document_signatures',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      DocumentSignatureModel.singleton = this;
    }

    return DocumentSignatureModel.singleton;
  }

  /**
   * Get by document ID.
   * @param documentId Document ID.
   * @param createdBy Created by.
   * @param attributes Sequelize attributes option.
   * @param order Sequelize order option.
   * @returns Document signatures list promise.
   */
  async getByDocumentId(documentId: string, createdBy?: string, attributes?: string[], order?: unknown[]): Promise<DocumentSignatureEntity[]> {
    const options: any = {
      where: {
        document_id: documentId,
      },
    };

    if (createdBy) {
      options.where.created_by = createdBy;
    }

    if (attributes?.length) {
      options.attributes = attributes;
    }

    if (order?.length) {
      options.order = order;
    }

    // Get signatures.
    const documentSignature = await this.model.findAll(options);

    // Convert to entities.
    const documentSignaturesEntities = documentSignature.map((item) => {
      return this.prepareEntity(item);
    });

    return documentSignaturesEntities;
  }

  /**
   * Create.
   * @returns Created document signature entity promise.
   */
  async create({ documentId, signature, type, certificate, createdBy }: CreateDocumentSignatureParams): Promise<DocumentSignatureEntity> {
    // Prepare signature record.
    const signatureModel = this.prepareForModel({ documentId, signature, type, certificate, createdBy });

    // Create and return signature.
    const createdSignature = await this.model.create(signatureModel);

    // Return created signature.
    return this.prepareEntity(createdSignature);
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
   * @param item Raw document signature row.
   */
  prepareEntity(item: DocumentSignatureRow): DocumentSignatureEntity {
    return new DocumentSignatureEntity({
      id: item.id,
      documentId: item.document_id,
      signature: item.signature,
      type: item.type,
      certificate: item.certificate,
      createdBy: item.created_by,
      createdAt: item.created_at,
    });
  }

  /**
   * Prepare for model.
   * @param item Camel-cased entity-shaped fields to persist.
   */
  prepareForModel(item: Partial<DocumentSignatureEntityOptions>): Partial<DocumentSignatureRow> {
    return {
      document_id: item.documentId,
      signature: item.signature,
      type: item.type,
      certificate: item.certificate,
      created_by: item.createdBy,
    };
  }
}

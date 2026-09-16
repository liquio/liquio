import Sequelize from 'sequelize';

import { Model } from './model';
import { DocumentEntity, DocumentEntityOptions, DocumentAsic } from '../entities/document';
import { RedisClient } from '../lib/redis_client';

// Constants.
const SYSTEM_USER = 'system';
const GET_ALL_BY_WORKFLOW_ID_CACHE_TTL = 600; // 10 minutes.

/**
 * Raw shape of a `documents` row as Sequelize hands it back (snake_case columns) - what
 * {@link DocumentModel#prepareEntity} consumes and {@link DocumentModel#prepareForModel} produces.
 * Deliberately not `this.model`'s generic type parameter: the live Sequelize instance also carries
 * a monkey-patched `.prepareEntity` (see the constructor) and, when queried `include`-ing the
 * task association, a `.task` property - both dynamic additions this interface does not attempt
 * to model, so call sites that need them keep using the raw instance (typed `any`) directly.
 */
export interface DocumentRow {
  id: string;
  external_id?: string | null;
  parent_id?: string | null;
  document_template_id?: number | null;
  document_state_id?: number | null;
  cancellation_type_id?: number | null;
  number?: string | null;
  is_final?: boolean;
  owner_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  /** Arbitrary, document-template-defined JSON blob - not modeled precisely (see `DocumentEntity#data`). */
  data?: any;
  description?: string | null;
  file_id?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  asic: DocumentAsic;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateDocumentParams {
  parentId?: string;
  documentTemplateId: number;
  userId?: string;
  number?: string;
}

export interface AddDocumentFileParams {
  id: string;
  updatedBy?: string;
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
}

export interface DocumentFileInfo {
  documentId: string;
  documentTemplateId: number;
  fileId: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentModel extends Model {
  private static singleton: DocumentModel;

  /**
   * The live Sequelize model. Kept as `any` rather than `Sequelize.ModelStatic<...>`: besides the
   * dynamic `.task`/`.prepareEntity` additions described on {@link DocumentRow}, it is also passed
   * around directly as an `include`d association target elsewhere (e.g. `models/task.ts`), which
   * would require modeling the full set of cross-model associations to type precisely.
   */
  model: any;

  constructor() {
    if (!DocumentModel.singleton) {
      super();

      this.model = this.db.define(
        'document',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          external_id: Sequelize.STRING,
          parent_id: Sequelize.UUID,
          document_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'document_templates', key: 'id' },
          },
          document_state_id: Sequelize.INTEGER,
          cancellation_type_id: Sequelize.INTEGER,
          number: Sequelize.STRING,
          is_final: Sequelize.BOOLEAN,
          owner_id: Sequelize.INTEGER,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          data: Sequelize.JSON,
          description: Sequelize.STRING,
          file_id: Sequelize.STRING,
          file_name: Sequelize.STRING,
          file_type: Sequelize.STRING,
          file_size: Sequelize.INTEGER,
          asic: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {
              asicmanifestFileId: null,
              filesIds: [],
            },
          },
        },
        {
          tableName: 'documents',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      DocumentModel.singleton = this;
    }

    return DocumentModel.singleton;
  }

  /**
   * Find by ID.
   * @param id Document ID.
   * @param includeTask Include task data.
   * @param includeTaskTemplate Include task template.
   */
  async findById(id: string, includeTask = false, includeTaskTemplate = false): Promise<DocumentEntity | undefined> {
    const document = await this.model.findByPk(id, {
      include: [{ model: global.models.task.model, required: includeTask }],
    });

    if (!document) {
      return;
    }

    const documentEntity = await this.prepareEntity(document);

    if (document.task) {
      documentEntity.task = document.task.prepareEntity(document.task);
      if (includeTaskTemplate && !documentEntity.task.taskTemplate?.jsonSchema) {
        documentEntity.task.taskTemplate = await global.models.taskTemplate.findById(document.task.task_template_id);
      }
    }

    return documentEntity;
  }

  /**
   * Get by IDs list.
   * @param ids Document IDs list.
   * @returns Promise of documents list.
   */
  async getByIds(ids: string[]): Promise<DocumentEntity[]> {
    const documents = await this.model.findAll({ where: { id: ids } });
    return Promise.all(documents.map((item) => this.prepareEntity(item)));
  }

  /**
   * Check exists.
   * @param documentTemplateId Document template ID.
   * @param isFinal Is final indicator.
   * @param updatedAtFrom Updated from date.
   * @returns Is exists indicator promise.
   */
  async checkExists(documentTemplateId: number, isFinal: boolean, updatedAtFrom: Date): Promise<boolean> {
    const rawDocument = await this.model.findOne({
      where: {
        document_template_id: documentTemplateId,
        is_final: isFinal,
        updated_at: { [Sequelize.Op.gte]: updatedAtFrom },
      },
      attributes: ['id', 'document_template_id', 'is_final', 'updated_at'],
    });

    const exists = !!rawDocument;

    return exists;
  }

  /**
   * Get by external ID.
   * @param externalId External ID.
   * @returns Promise of document.
   */
  async getByExternalId(externalId: string): Promise<DocumentEntity | undefined> {
    const rawDocument = await this.model.findOne({ where: { external_id: externalId } });

    if (!rawDocument) {
      return;
    }

    const document = await this.prepareEntity(rawDocument);
    return document;
  }

  async isExternalIdExists(externalId: string): Promise<boolean> {
    const documentId = await this.model.findOne({ attributes: ['id'], raw: true, where: { external_id: externalId } });

    return !!documentId;
  }

  /**
   * Get files names.
   * @param ids Document IDs list.
   * @returns Promise of documents file names info list.
   */
  async getFilesNamesByIds(ids: string[]): Promise<DocumentFileInfo[]> {
    const documents = await this.model.findAll({
      where: { id: ids, is_final: true },
      attributes: ['id', 'document_template_id', 'file_id', 'file_name', 'file_size', 'created_at', 'updated_at'],
    });

    return documents.map((item) => ({
      documentId: item.id,
      documentTemplateId: item.document_template_id,
      fileId: item.file_id,
      fileName: item.file_name,
      fileSize: item.file_size,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  /**
   * Create document.
   */
  async create({ parentId, documentTemplateId, userId, number }: CreateDocumentParams): Promise<DocumentEntity> {
    const document = this.prepareForModel({
      parentId,
      documentTemplateId,
      documentStateId: 1,
      ownerId: userId || SYSTEM_USER,
      createdBy: userId || SYSTEM_USER,
      updatedBy: userId || SYSTEM_USER,
      data: {},
      number,
    });

    const rawDbResponse = await this.model.create(document);

    return this.prepareEntity(rawDbResponse);
  }

  /**
   * Update data.
   * @param id Document ID.
   * @param userId User ID.
   * @param data Data users.
   * @param clearGeneratedFile Clear generated file indicator.
   * @param isKeepDocumentFile
   * @returns Document entity promise.
   */
  async updateData(
    id: string,
    userId: string | undefined,
    data: any,
    clearGeneratedFile = false,
    isKeepDocumentFile = false,
  ): Promise<DocumentEntity | undefined> {
    const document = this.prepareForModel({ data: data, updatedBy: userId });
    if (clearGeneratedFile && !isKeepDocumentFile) {
      document.file_id = null;
      document.file_name = null;
      document.file_type = null;
      document.file_size = null;
    }
    const [, updatedDocument] = await this.model.update(document, {
      where: { id: id },
      returning: true,
    });

    if (updatedDocument.length === 1) {
      return this.prepareEntity(updatedDocument[0]);
    }
  }

  /**
   * Add document file.
   */
  async addDocumentFile({ id, updatedBy, fileId, fileName, fileType, fileSize }: AddDocumentFileParams) {
    const document = this.prepareForModel({ updatedBy, fileId, fileName, fileType, fileSize });
    const dbResponse = await this.model.update(document, { where: { id: id } });

    return dbResponse;
  }

  /**
   * Set status final.
   * @param id Document ID.
   * @returns Whether this call is the one that actually flipped `is_final`
   * from `false` to `true` (guarded by the `is_final: false` condition below). `false` means the
   * document was already final - callers must treat that as "someone else already finished this"
   * and skip any one-time completion side effects instead of repeating them.
   */
  async setStatusFinal(id: string): Promise<boolean> {
    const documentEntity = await this.findById(id);

    const [affectedCount] = await this.model.update(
      {
        is_final: true,
        data: documentEntity.data,
      },
      { where: { id, is_final: false } },
    );

    return affectedCount > 0;
  }

  /**
   * Set ASIC info.
   * @param id Document ID.
   * @param asic ASIC info.
   */
  async setAsicInfo(id: string, asic: DocumentAsic): Promise<void> {
    await this.model.update({ asic }, { where: { id } });
  }

  /**
   * Set external ID.
   * @param id Document ID.
   * @param externalId External ID.
   */
  async setExternalId(id: string, externalId: string) {
    const dbResponse = await this.model.update({ external_id: externalId }, { where: { id } });

    return dbResponse;
  }

  /**
   * Delete by ID.
   * @param id ID.
   */
  async deleteById(id: string): Promise<void> {
    await this.model.destroy({ where: { id } });
  }

  /**
   * Get all documents by workflowId.
   * @return Promise of documents list.
   */
  async getAllByWorkflowId({ workflowId, order = 'desc' }: { workflowId: string; order?: 'asc' | 'desc' }): Promise<DocumentEntity[]> {
    const { data: documents } = await RedisClient.getOrSetWithTimestamp(
      RedisClient.createKey('document', 'getAllByWorkflowId', workflowId, order),
      async () => this.getTimestampByWorkflowId(workflowId),
      async () =>
        this.model.findAll({
          include: [{ model: global.models.task.model, where: { workflow_id: workflowId } }],
          order: [['created_at', order]],
        }),
      GET_ALL_BY_WORKFLOW_ID_CACHE_TTL,
    );

    const entities: DocumentEntity[] = [];
    for (const item of documents) {
      const document = await this.prepareEntity(item);
      if (item.task) {
        document.task = global.models.task.prepareEntity(item.task);
      }
      entities.push(document);
    }

    return entities;
  }

  /**
   * Timestamp workflow documents
   * @param workflowId
   * @return Timestamp
   */
  async getTimestampByWorkflowId(workflowId: string): Promise<string> {
    const [{ maxTimestamp }] = await this.db.query(
      `
        select
          max(d.updated_at) as "maxTimestamp"
        from documents d
        left join tasks t on t.document_id = d.id
        where t.workflow_id = :workflowId
      `,
      {
        replacements: { workflowId },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    return maxTimestamp;
  }

  /**
   * Prepare entity.
   * @param item Raw document row (a live Sequelize instance, or a plain object shaped like one).
   */
  async prepareEntity(item: DocumentRow): Promise<DocumentEntity> {
    const docTemplate = await global.models.documentTemplate.findById(item.document_template_id);

    const newDocumentEntity = new DocumentEntity({
      id: item.id,
      externalId: item.external_id,
      parentId: item.parent_id,
      documentTemplateId: item.document_template_id,
      documentStateId: item.document_state_id,
      cancellationTypeId: item.cancellation_type_id,
      number: item.number,
      isFinal: item.is_final,
      ownerId: item.owner_id,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      data: item.data,
      description: item.description,
      fileId: item.file_id,
      fileName: item.file_name,
      fileType: item.file_type,
      asic: item.asic,
      documentTemplate: docTemplate,
      fileSize: item.file_size,
    });

    newDocumentEntity.calcGetters();

    return newDocumentEntity;
  }

  /**
   * Prepare for model.
   * @param item Camel-cased entity-shaped fields to persist (need not be a full `DocumentEntity`).
   */
  prepareForModel(item: Partial<DocumentEntityOptions>): Partial<DocumentRow> {
    return {
      external_id: item.externalId,
      parent_id: item.parentId,
      document_template_id: item.documentTemplateId,
      document_state_id: item.documentStateId,
      cancellation_type_id: item.cancellationTypeId,
      number: item.number,
      is_final: item.isFinal,
      owner_id: item.ownerId,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      data: item.data,
      description: item.description,
      file_id: item.fileId,
      file_name: item.fileName,
      file_type: item.fileType,
      file_size: item.fileSize,
      asic: item.asic,
    };
  }
}

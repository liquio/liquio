const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentAttachmentEntity = require('../entities/document_attachment');

/**
 * Document attachment model.
 */
class DocumentAttachmentModel extends Model {
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
   * Create attachment.
   * @param {object} data Data object.
   * @param {string} data.documentId Document ID.
   * @param {string} data.link Link.
   * @param {string} data.name Name.
   * @param {boolean} [data.isGenerated] Is generated indicator.
   * @param {boolean} [data.isSystem] Is system.
   * @param {string} data.type Type.
   * @param {string[]} data.labels Labels.
   * @param {object} data.meta Meta.
   */
  async create({ documentId, link, name, type, size = 0, labels = [], isGenerated = false, isSystem = false, meta = {} }) {
    const attachment = this.prepareForModel({ documentId, link, name, type, size, labels, isGenerated, isSystem, meta });
    const rawDbResponse = await this.model.create(attachment);

    return this.prepareEntity(rawDbResponse);
  }

  /**
   * Get by document ID.
   * @param {string} documentId Document ID.
   * @returns {Promise<DocumentAttachmentEntity[]>} Promise of document attachments list.
   */
  async getByDocumentId(documentId) {
    // Get attachments RAW records from DB.
    const attachmentsRaw = await this.model.findAll({ where: { document_id: documentId } });

    // Define and return attachments entities.
    const attachments = attachmentsRaw.map(this.prepareEntity).sort((a, b) => +(a.id > b.id));
    return attachments;
  }

  /**
   * Get by multiple document IDs.
   * @param {string[]} documentIds Document IDs.
   * @returns {Promise<DocumentAttachmentEntity[]>} Promise of document attachments list.
   */
  async getByDocumentIds(documentIds) {
    // Get attachments RAW records from DB.
    const attachmentsRaw = await this.model.findAll({ where: { document_id: documentIds } });

    // Define and return attachments entities.
    return attachmentsRaw.map(this.prepareEntity).sort((a, b) => +(a.id > b.id));
  }

  /**
   * Delete by document ID.
   * @param {string} documentId Document ID.
   */
  async deleteByDocumentId(documentId) {
    await this.model.destroy({ where: { document_id: documentId } });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {DocumentEntity}
   */
  prepareEntity(item) {
    return new DocumentAttachmentEntity({
      id: item.id,
      documentId: item.document_id,
      link: item.link,
      name: item.name,
      type: item.type,
      size: item.size,
      labels: item.labels,
      isGenerated: item.is_generated,
      createdAt: item.created_at,
      meta: item.meta,
    });
  }

  /**
   * Prepare for model.
   * @param {DocumentAttachmentEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
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

module.exports = DocumentAttachmentModel;

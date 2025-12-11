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
      labels: item.labels,
      isGenerated: item.is_generated,
      isSystem: item.is_system,
      meta: item.meta,
      createdAt: item.created_at,
    });
  }
}

module.exports = DocumentAttachmentModel;

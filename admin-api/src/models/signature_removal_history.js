const Sequelize = require('sequelize');
const Model = require('./model');
const SignatureRemovalHistoryEntity = require('../entities/signature_removal_history');

class SignatureRemovalHistory extends Model {
  constructor(dbInstance) {
    if (!SignatureRemovalHistory.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'signatureRemovalHistory',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          signature_id: {
            allowNull: false,
            type: Sequelize.UUID,
          },
          signature_created_by: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          signature_created_at: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          signature_updated_at: {
            allowNull: true,
            type: Sequelize.DATE,
          },
          p7s: {
            allowNull: true,
            type: Sequelize.TEXT,
          },
          file_name: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          signature_type: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          document_id: {
            allowNull: false,
            type: Sequelize.UUID,
            references: { model: 'document', key: 'id' },
          },
          workflow_id: {
            allowNull: false,
            type: Sequelize.UUID,
            references: { model: 'workflow', key: 'id' },
          },
          user_id: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          user_name: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        {
          tableName: 'signature_removal_history',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: false,
        },
      );

      SignatureRemovalHistory.singleton = this;
    }

    return SignatureRemovalHistory.singleton;
  }

  /**
   * Create.
   * @param {object} signature Signature.
   * @param {string} signature.id Signature ID.
   * @param {string} signature.createdBy Signature created by.
   * @param {string} signature.createdAt Signature created at.
   * @param {string} signature.updatedAt Signature updated at.
   * @param {string} signature.p7s P7s.
   * @param {string} signature.fileName File name if p7s.
   * @param {string} signature.type Signature type.
   * @param {string} documentId Document ID.
   * @param {string} workflowId Workflow ID.
   * @param {object} user User.
   * @param {string} user.userId User ID.
   * @param {string} user.userName User name.
   * @returns {Promise<SignatureRemovalHistoryEntity>} Document signature removal history entity promise.
   */
  async create(signature, documentId, workflowId, user) {
    // Prepare signature record.
    const dataForModel = this.prepareForModel({ ...signature, documentId, workflowId, ...user });

    // Create and return signature.
    const result = await this.model.create(dataForModel);

    // Return created signature.
    return this.prepareEntity(result);
  }

  /**
   * Get by workflow ID.
   * @param {string} documentId Document ID.
   * @returns {Promise<SignatureRemovalHistoryEntity[]>} DocumDocument signature removal history entity promise.
   */
  async getByWorkflowId(workflowId) {
    // Get signatures.
    const documentSignatureRemovalHistory = await this.model.findAll({ where: { workflow_id: workflowId } });

    return documentSignatureRemovalHistory.map((item) => this.prepareEntity(item));
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {SignatureRemovalHistoryEntity}
   */
  prepareEntity(item) {
    return new SignatureRemovalHistoryEntity({
      id: item.id,
      signatureId: item.signature_id,
      signatureCreatedBy: item.signature_created_by,
      signatureCreatedAt: item.signature_created_at,
      signatureUpdatedAt: item.signature_updated_at,
      p7s: item.p7s,
      fileName: item.file_name,
      signatureType: item.signature_type,
      documentId: item.document_id,
      workflowId: item.workflow_id,
      userId: item.user_id,
      userName: item.user_name,
      createdAt: item.created_at,
    });
  }

  /**
   * Prepare for model.
   * @param {SignatureRemovalHistoryEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      signature_id: item.id,
      signature_created_by: item.createdBy,
      signature_created_at: item.createdAt,
      signature_updated_at: item.updatedAt,
      p7s: item.p7s,
      file_name: item.fileName,
      signature_type: item.type,
      document_id: item.documentId,
      workflow_id: item.workflowId,
      user_id: item.userId,
      user_name: item.userName,
    };
  }
}

module.exports = SignatureRemovalHistory;

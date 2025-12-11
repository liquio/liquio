const Sequelize = require('sequelize');

const Model = require('./model');
const UserInboxEntity = require('../entities/user_inbox');

class UserInboxModel extends Model {
  constructor() {
    if (!UserInboxModel.singleton) {
      super();

      this.model = this.db.define(
        'userInbox',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          user_id: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          document_id: {
            allowNull: false,
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' },
          },
          name: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          number: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          is_read: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
          },
        },
        {
          tableName: 'user_inboxes',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      UserInboxModel.singleton = this;
    }

    return UserInboxModel.singleton;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.userId User ID.
   * @param {string} data.documentId Document ID.
   * @param {string} data.name Name.
   * @param {string} data.number Number.
   * @param {boolean} data.isRead Is read indicator.
   * @returns {Promise<UserInboxEntity>} User inbox promise.
   */
  async create({ userId, documentId, name, number }) {
    // Prepare record.
    const userInboxModel = this.prepareForModel({ userId, documentId, name, number });

    // Create and return record.
    const createdUserInbox = await this.model.create(userInboxModel);

    return this.prepareEntity(createdUserInbox);
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
   * @private
   * @param {object} item User inbox model record.
   * @returns {UserInboxEntity} User inbox entity.
   */
  prepareEntity(item) {
    return new UserInboxEntity({
      id: item.id,
      userId: item.user_id,
      documentId: item.document_id,
      name: item.name,
      number: item.number,
      isRead: item.is_read,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @private
   * @param {UserInboxEntity} item User inbox entity.
   * @returns {object} User inbox model record.
   */
  prepareForModel(item) {
    return {
      id: item.id,
      user_id: item.userId,
      document_id: item.documentId,
      name: item.name,
      number: item.number,
      is_read: item.isRead,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = UserInboxModel;

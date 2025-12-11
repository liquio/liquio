const Sequelize = require('sequelize');
const _ = require('lodash');
const Model = require('./model');
const UserInboxEntity = require('../entities/user_inbox');

class UserInboxModel extends Model {
  constructor(dbInstance) {
    if (!UserInboxModel.singleton) {
      super(dbInstance);

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

      this.model.paginate = this.paginate;

      UserInboxModel.singleton = this;
    }

    return UserInboxModel.singleton;
  }

  /**
   * Get by user ID.
   * @param {string} userId User ID.
   * @param {object} options Options.
   * @returns {Promise<{data: UserInboxEntity[]}>} User inboxes list promise.
   */
  async getByUserId(userId, { currentPage, perPage, filters, sort }) {
    // Prepare.
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: { ..._.pick(filters, ['name', 'number', 'is_read']), user_id: userId },
    };

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    // Get records.
    let userInboxes = await this.model.paginate(sequelizeOptions);

    // Convert data to entities.
    userInboxes.data = userInboxes.data.map((item) => {
      return this.prepareEntity(item);
    });

    return userInboxes;
  }

  /**
   * Get count by user ID.
   * @param {string} userId User ID.
   * @returns {Promise<number>} User inboxes unread count promise.
   */
  async getUnreadCountByUserId(userId) {
    // Get and return records amount.
    let userInboxes = await this.model.count({ where: { user_id: userId, is_read: false } });

    return userInboxes;
  }

  /**
   * Get by user ID and documet ID.
   * @param {string} userId User ID.
   * @param {string} documentId Document ID.
   * @returns {Promise<UserInboxEntity[]>} User inboxes list promise.
   */
  async getByUserIdAndDocumentId(userId, documentId) {
    // Get signatures.
    const userInboxes = await this.model.findAll({ where: { user_id: userId, document_id: documentId } });

    const userInbox = userInboxes.length === 1 ? userInboxes : undefined;
    if (!userInbox) {
      return;
    }

    // Convert to entity and return.
    const userInboxEntity = this.prepareEntity(userInbox);
    return userInboxEntity;
  }

  /**
   * Find by ID.
   * @param {string} id User inbox ID.
   * @returns {Promise<UserInboxEntity>} User inbox promise.
   */
  async findById(id) {
    const userInbox = await this.model.findByPk(id);

    if (!userInbox) {
      return;
    }
    return this.prepareEntity(userInbox);
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
   * Set is read.
   * @param {string} id Document ID.
   * @returns {Promise<undefined>} Promise.
   */
  async setIsRead(id) {
    await this.model.update({ is_read: true }, { where: { id } });
  }

  /**
   * Delete by ID.
   * @param {string} id User inbox ID.
   * @returns {Promise<number>} Deleted user inboxes count promise.
   */
  async deleteById(id) {
    await this.model.destroy({ where: { id } });
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

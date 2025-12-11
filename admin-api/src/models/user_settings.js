const Sequelize = require('sequelize');

const Model = require('./model');
const UserSettingsEntity = require('../entities/user_settings');

/**
 * User settings model.
 */
class UserSettingsModel extends Model {
  /**
   * User settings model constructor.
   */
  constructor(dbInstance) {
    // Singleton.
    if (!UserSettingsModel.singleton) {
      super(dbInstance);

      // Sequelize model.
      this.model = this.db.define(
        'userSettings',
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: Sequelize.UUIDV1,
          },
          user_id: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          data: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
        },
        {
          tableName: 'user_settings',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;

      // Define singleton.
      UserSettingsModel.singleton = this;
    }

    // Return singleton.
    return UserSettingsModel.singleton;
  }

  /**
   * Get user settings.
   * @param {string} userId User ID.
   * @returns {Promise<UserSettingsEntity>}
   */
  async get(userId) {
    const userSettings = await this.model.findOne({
      where: {
        user_id: userId,
      },
    });

    return userSettings ? this.prepareEntity(userSettings) : null;
  }

  /**
   * Create or update user settings.
   * @param {string} userId User ID.
   * @param {object} data User settings JSON data.
   * @returns {Promise<UserSettingsEntity>}
   */
  async createOrUpdate(userId, data) {
    const toSave = this.prepareForModel({ userId, data });

    const existingUserSettings = await this.model.findOne({ where: { user_id: userId } });
    if (!existingUserSettings) {
      const userSettings = await this.model.create(toSave, { returning: true });
      return this.prepareEntity(userSettings);
    }

    const rawDbResponse = await this.model.update(toSave, { where: { user_id: userId }, returning: true });
    const [updatedRow] = rawDbResponse[1] || {};
    return this.prepareEntity(updatedRow);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @param {string} item.id ID.
   * @param {string} item.user_id User ID.
   * @param {object} item.data Settings JSON data.
   * @param {string} item.created_at Created at.
   * @param {string} item.updated_at Updated at.
   * @returns {UserSettingsEntity}
   */
  prepareEntity(item) {
    return new UserSettingsEntity({
      id: item.id,
      userId: item.user_id,
      data: item.data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {{userId: string, data: object}} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item) {
    const { userId, data } = item;

    return {
      user_id: userId,
      data: data,
    };
  }
}

module.exports = UserSettingsModel;

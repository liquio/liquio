const Sequelize = require('sequelize');

const Model = require('./model');
const ShareAccessEntity = require('../entities/share_access');

/**
 * Share access model.
 */
class ShareAccessModel extends Model {
  /**
   * Share access model constructor.
   */
  constructor() {
    if (!ShareAccessModel.singleton) {
      super();

      // Sequelize model.
      this.model = this.db.define(
        'shareAccess',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          share_from: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {},
          },
          share_to: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {},
          },
          access_type: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: ['create-workflow', 'edit-task', 'commit-task'],
          },
          access_details: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {},
          },
          expire_date: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        {
          tableName: 'share_access',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Define singleton.
      ShareAccessModel.singleton = this;
    }

    // Return singleton.
    return ShareAccessModel.singleton;
  }

  /**
   * Create.
   * @param {object} data Data.
   * @param {string} options.id ID.
   * @param {'create-workflow'|'edit-task'|'commit-task'} options.accessType Access type.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   * @returns {Promise<Sh
   */
  async create(data) {
    const shareAccess = await this.model.create(this.prepareForModel(data));

    return new ShareAccessEntity(shareAccess);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {ShareAccessEntity}
   */
  prepareEntity(item) {
    return new ShareAccessEntity({
      id: item.id,
      shareFrom: item.share_from,
      shareTo: item.share_to,
      accessType: item.access_type,
      accessDetails: item.access_details,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {ShareAccessEntity} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      id: item.id,
      share_from: item.shareFrom,
      share_to: item.shareTo,
      access_type: item.accessType,
      access_details: item.accessDetails,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = ShareAccessModel;

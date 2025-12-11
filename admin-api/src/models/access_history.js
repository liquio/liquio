const Sequelize = require('sequelize');

const Model = require('./model');
const AccessHistoryEntity = require('../entities/access_history');

/**
 * Access history model.
 */
class AccessHistoryModel extends Model {
  /**
   * Access history model constructor.
   */
  constructor(dbInstance) {
    // Singleton.
    if (!AccessHistoryModel.singleton) {
      // Call parent constructor.
      super(dbInstance);

      // Sequelize model.
      this.model = this.db.define(
        'accessHistory',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          user_id: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          user_name: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          ipn: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          operation_type: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: [
              'added-to-head-unit',
              'added-to-member-unit',
              'deleted-from-head-unit',
              'deleted-from-member-unit',
              'added-to-admin',
              'deleted-from-admin',
            ],
          },
          unit_id: {
            allowNull: true,
            type: Sequelize.INTEGER,
          },
          unit_name: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          init_user_id: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          init_user_name: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          init_ipn: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          init_workflow_id: {
            allowNull: true,
            type: Sequelize.UUID,
          },
          init_workflow_name: {
            allowNull: true,
            type: Sequelize.STRING,
          },
        },
        {
          tableName: 'access_history',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      // Define singleton.
      AccessHistoryModel.singleton = this;
    }

    // Return singleton.
    return AccessHistoryModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<AccessHistoryEntity[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: { ...filters },
      sort: [['created_at', 'desc']],
    };

    if (typeof filters.init_user_name !== 'undefined') {
      sequelizeOptions.filters.init_user_name = {
        [Sequelize.Op.iLike]: `%${filters.init_user_name}%`,
      };
    }
    if (typeof filters.unit_name !== 'undefined') {
      sequelizeOptions.filters.unit_name = {
        [Sequelize.Op.iLike]: `%${filters.unit_name}%`,
      };
    }
    if (typeof filters.user_name !== 'undefined') {
      sequelizeOptions.filters.user_name = {
        [Sequelize.Op.iLike]: `%${filters.user_name}%`,
      };
    }
    if (typeof filters.from_created_at !== 'undefined' && typeof filters.to_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = Sequelize.where(Sequelize.fn('date', Sequelize.col('created_at')), {
        [Sequelize.Op.between]: [filters.from_created_at, filters.to_created_at],
      });

      delete sequelizeOptions.filters.from_created_at;
      delete sequelizeOptions.filters.to_created_at;
    } else if (typeof filters.from_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = Sequelize.where(Sequelize.fn('date', Sequelize.col('created_at')), {
        [Sequelize.Op.gte]: filters.from_created_at,
      });

      delete sequelizeOptions.filters.from_created_at;
    } else if (typeof filters.to_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = Sequelize.where(Sequelize.fn('date', Sequelize.col('created_at')), {
        [Sequelize.Op.lte]: filters.to_created_at,
      });

      delete sequelizeOptions.filters.to_created_at;
    }

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    const entities = await this.model.paginate(sequelizeOptions);

    entities.data = entities.data.map((item) => this.prepareEntity(item));

    return entities;
  }

  /**
   * Create.
   * @param {object} data Access history.
   * @param {string} options.id ID.
   * @param {string} options.userId User ID.
   * @param {string} options.userName User name.
   * @param {string} options.ipn Ipn.
   * @param {'added-to-head-unit'|'added-to-member-unit'|'deleted-from-head-unit'|'deleted-from-member-unit'|'added-to-admin'|'deleted-from-admin'} options.operationType Operation type.
   * @param {number} options.unitId Unit ID.
   * @param {string} options.unitName Unit name.
   * @param {string} options.initUserId Init user ID.
   * @param {string} options.initUserName Init user name.
   * @param {string} options.initIpn Init ipn.
   * @param {string} options.initWorkflowId Init workflow ID.
   * @param {string} options.initWorkflowName Init workflow name.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   * @returns {Promise<AccessHistoryEntity>}
   */
  async create(data) {
    const accessHistory = await this.model.create(this.prepareForModel(data));

    return new AccessHistoryEntity(accessHistory);
  }

  /**
   * Save by groups of objects.
   * @param {object} currentUser
   * @param {object} [unit]
   * @param {string} operationType
   * @param {object} [user]
   */
  async save({ currentUser, operationType, unit, user }) {
    await this.create({
      userId: user && user.userId,
      userName: user && user.name,
      ipn: user && user.ipn,
      operationType: operationType,
      unitId: unit && unit.id,
      unitName: unit && unit.name,
      initUserId: currentUser.userId,
      initUserName: currentUser.name,
      initIpn: currentUser.ipn,
    });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {AccessHistoryEntity}
   */
  prepareEntity(item) {
    return new AccessHistoryEntity({
      id: item.id,
      userId: item.user_id,
      userName: item.user_name,
      ipn: item.ipn,
      operationType: item.operation_type,
      unitId: item.unit_id,
      unitName: item.unit_name,
      initUserId: item.init_user_id,
      initUserName: item.init_user_name,
      initIpn: item.init_ipn,
      initWorkflowId: item.init_workflow_id,
      initWorkflowName: item.init_workflow_name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {AccessHistoryEntity} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      id: item.id,
      user_id: item.userId,
      user_name: item.userName,
      ipn: item.ipn,
      operation_type: item.operationType,
      unit_id: item.unitId,
      unit_name: item.unitName,
      init_user_id: item.initUserId,
      init_user_name: item.initUserName,
      init_ipn: item.initIpn,
      init_workflow_id: item.initWorkflowId,
      init_workflow_name: item.initWorkflowName,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = AccessHistoryModel;

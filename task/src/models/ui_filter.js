
const Sequelize = require('sequelize');
const Model = require('./model');
const UIFilterEntity = require('../entities/ui_filter');

/**
 * UI Filter model.
 */
class UIFilterModel extends Model {
  /**
   * UI Filter model constructor.
   */
  constructor() {
    // Singleton.
    if (!UIFilterModel.singleton) {
      // Call parent constructor.
      super();

      // Sequelize model.
      this.model = this.db.define(
        'uiFilter',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER
          },
          name: {
            allowNull: false,
            type: Sequelize.STRING
          },
          filter: {
            allowNull: false,
            type: Sequelize.STRING
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE
          }
        },
        {
          tableName: 'ui_filters',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;

      // Define singleton.
      UIFilterModel.singleton = this;
    }

    // Return singleton.
    return UIFilterModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<UIFilterEntity[]>} UI Filter entities promise.
   */
  async getAll() {
    // DB query.
    const raw = await this.model.findAll({
      where: { is_active: true },
      sort: [['created_at', 'asc']]
    });

    // Return entities.
    const entities = raw.map(this.prepareEntity);
    return entities;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {UIFilterEntity} UI Filter entity.
   */
  prepareEntity(item) {
    return new UIFilterEntity({
      id: item.id,
      name: item.name,
      filter: item.filter,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  }

  /**
   * Prepare for model.
   * @param {UIFilterEntity} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      id: item.id,
      name: item.name,
      filter: item.filter,
      is_active: item.isActive,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    };
  }
}

module.exports = UIFilterModel;

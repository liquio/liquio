
const Sequelize = require('sequelize');
const Model = require('./model');
const CustomInterfaceEntity = require('../entities/custom_interface');

/**
 * Custom interface model.
 */
class CustomInterfaceModel extends Model {
  /**
   * Custom interface model constructor.
   */
  constructor() {
    // Singleton.
    if (!CustomInterfaceModel.singleton) {
      // Call parent constructor.
      super();

      // Sequelize model.
      this.model = this.db.define(
        'customInterface',
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
          route: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          interface_schema: {
            allowNull: false,
            type: Sequelize.TEXT
          },
          units: {
            allowNull: false,
            type: Sequelize.ARRAY(Sequelize.INTEGER),
            defaultValue: []
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
          tableName: 'custom_interfaces',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;

      // Define singleton.
      CustomInterfaceModel.singleton = this;
    }

    // Return singleton.
    return CustomInterfaceModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<CustomInterfaceEntity>}
   */
  async findById(id) {
    const customInterface = await this.model.findByPk(id);

    return this.prepareEntity(customInterface);
  }

  /**
   * Get all.
   * @returns {Promise<CustomInterfaceEntity[]>} Custom interface entities promise.
   */
  async getAll({ route }) {
    // DB query.
    const raw = await this.model.findAll({
      where: { route, is_active: true }
    });

    // Return entities.
    const entities = raw.map(this.prepareEntity);
    return entities;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {CustomInterfaceEntity} Custom interface entity.
   */
  prepareEntity(item) {
    return new CustomInterfaceEntity({
      id: item.id,
      name: item.name,
      route: item.route,
      isActive: item.is_active,
      interfaceSchema: item.interface_schema,
      units: item.units,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  }

  /**
   * Prepare for model.
   * @param {CustomInterfaceEntity} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      id: item.id,
      name: item.name,
      route: item.route,
      is_active: item.isActive,
      interface_schema: item.interfaceSchema,
      units: item.units,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    };
  }
}

module.exports = CustomInterfaceModel;

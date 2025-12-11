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
  constructor(dbInstance) {
    // Singleton.
    if (!CustomInterfaceModel.singleton) {
      // Call parent constructor.
      super(dbInstance);

      // Sequelize model.
      this.model = this.db.define(
        'customInterface',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER,
          },
          name: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          route: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          interface_schema: {
            allowNull: false,
            type: Sequelize.TEXT,
          },
          units: {
            allowNull: false,
            type: Sequelize.ARRAY(Sequelize.INTEGER),
            defaultValue: [],
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        {
          tableName: 'custom_interfaces',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

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
   * @returns {Promise<CustomInterfaceEntity[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: { ...filters },
      sort: [['created_at', 'desc']],
    };

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    const customInterfaces = await this.model.paginate(sequelizeOptions);

    customInterfaces.data = customInterfaces.data.map((item) => this.prepareEntity(item));

    return customInterfaces;
  }

  /**
   * Create Custom interface.
   * @param {CustomInterfaceEntity} customInterfaceEntity Custom interface entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<UnitEntity>}
   */
  async create(customInterfaceEntity, transaction) {
    if (!(customInterfaceEntity instanceof CustomInterfaceEntity)) {
      throw new Error('Must be instance of customInterfaceEntity');
    }

    const [data] = await this.model.upsert(this.prepareForModel(customInterfaceEntity), {
      returning: true,
      transaction,
    });

    return this.prepareEntity(data);
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @returns {Promise<number}
   */
  async deleteById(id) {
    return await this.model.destroy({
      where: { id },
    });
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
      updatedAt: item.updated_at,
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
      updated_at: item.updatedAt,
    };
  }
}

module.exports = CustomInterfaceModel;

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
  constructor(dbInstance) {
    // Singleton.
    if (!UIFilterModel.singleton) {
      // Call parent constructor.
      super(dbInstance);

      // Sequelize model.
      this.model = this.db.define(
        'uiFilter',
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
          filter: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
          tableName: 'ui_filters',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      // Define singleton.
      UIFilterModel.singleton = this;
    }

    // Return singleton.
    return UIFilterModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<UIFilterEntity>}
   */
  async findById(id) {
    const uiFilter = await this.model.findByPk(id);

    return this.prepareEntity(uiFilter);
  }

  /**
   * Get all.
   * @returns {Promise<UIFilterEntity[]>}
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

    const uiFilters = await this.model.paginate(sequelizeOptions);

    uiFilters.data = uiFilters.data.map((item) => this.prepareEntity(item));

    return uiFilters;
  }

  /**
   * Create UI Filter.
   * @param {UIFilterEntity} uiFilterEntity UI Filter entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<UnitEntity>}
   */
  async create(uiFilterEntity, transaction) {
    if (!(uiFilterEntity instanceof UIFilterEntity)) {
      throw new Error('Must be instance of UIFilterEntity');
    }

    const [data] = await this.model.upsert(this.prepareForModel(uiFilterEntity), {
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
   * @returns {UIFilterEntity} UI Filter entity.
   */
  prepareEntity(item) {
    return new UIFilterEntity({
      id: item.id,
      name: item.name,
      filter: item.filter,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
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
      updated_at: item.updatedAt,
    };
  }
}

module.exports = UIFilterModel;

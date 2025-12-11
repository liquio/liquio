const Sequelize = require('sequelize');
const Model = require('./model');
const ProxyItemEntity = require('../entities/proxy_item');

class ProxyItemModel extends Model {
  constructor(dbInstance) {
    if (!ProxyItemModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'proxyItem',
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
          data: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {
              provider: null,
              link: null,
              tags: [],
            },
          },
          access_units: {
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
          tableName: 'proxy_items',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      ProxyItemModel.singleton = this;
    }

    return ProxyItemModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<ProxyItemEntity>}
   */
  async findById(id) {
    // DB query.
    const raw = await this.model.findByPk(id);

    // Return entity.
    return this.prepareEntity(raw);
  }

  /**
   * Get all.
   * @returns {Promise<ProxyItemEntity[]>}
   */
  async getAll() {
    // DB query.
    const rules = await this.model.findAll();
    const entities = rules.map((item) => {
      return this.prepareEntity(item);
    });

    // Return entities.
    return entities;
  }

  /**
   * Create.
   * @param {object} data Data.
   * @returns Created entity.
   */
  async create(data) {
    // DB query.
    const preapredForModel = this.prepareForModel(data);
    const raw = await this.model.create(preapredForModel);

    // Return entity.
    const entity = this.prepareEntity(raw);
    return entity;
  }

  /**
   * Update data.
   * @param {string} id ID.
   * @param {object} data Data.
   * @returns {Promise<DocumentEntity>}
   */
  async update(id, data) {
    // DB query.
    const raw = this.prepareForModel(data);
    const [, updatedRaw] = await this.model.update(raw, {
      where: { id: id },
      returning: true,
    });

    // Return entity.
    if (updatedRaw.length === 1) {
      return this.prepareEntity(updatedRaw[0]);
    }
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @returns {Promise<number}
   */
  async deleteById(id) {
    // DB query.
    const result = await this.model.destroy({
      where: { id },
    });

    // Return result.
    return result;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {ProxyItemEntity} Proxy item entity.
   */
  prepareEntity(item) {
    if (!item) return null;
    return new ProxyItemEntity({
      id: item.id,
      name: item.name,
      data: item.data,
      accessUnits: item.access_units,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {ProxyItemEntity} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      id: item.id,
      name: item.name,
      data: item.data,
      access_units: item.accessUnits,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = ProxyItemModel;

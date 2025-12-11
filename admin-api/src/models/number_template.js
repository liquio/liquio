const Sequelize = require('sequelize');
const SqlString = require('sequelize/lib/sql-string');
const _ = require('lodash');
const Model = require('./model');
const NumberTemplateEntity = require('../entities/number_template');

class NumberTemplateModel extends Model {
  constructor(dbInstance) {
    if (!NumberTemplateModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'numberTemplate',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          name: Sequelize.STRING,
          template: Sequelize.STRING,
        },
        {
          tableName: 'number_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      NumberTemplateModel.singleton = this;
    }

    return NumberTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @param {any} transaction Transaction.
   * @returns {Promise<NumberTemplateEntity>}
   */
  async findById(id, transaction) {
    const numberTemplate = await this.model.findByPk(id, { transaction });

    return this.prepareEntity(numberTemplate);
  }

  /**
   * Next increment.
   * @param {number} numberTemplateId Number template ID.
   * @returns {Promise<number>}
   */
  async nextIncrement(numberTemplateId) {
    const sequenceName = `number_template_sequence_${numberTemplateId}`;
    const [increment] = await this.model.sequelize.query('SELECT nextval(:sequenceName)', {
      replacements: { sequenceName },
      type: Sequelize.QueryTypes.SELECT,
    });

    return increment && increment.nextval;
  }

  /**
   * Get all.
   * @returns {Promise<NumberTemplateEntity[]>}
   */
  async getAll() {
    const numberTemplates = await this.model.findAll();

    const numberTemplateEntities = numberTemplates.map((item) => {
      return this.prepareEntity(item);
    });

    return numberTemplateEntities;
  }

  /**
   * Get all with pagination.
   * @returns {Promise<NumberTemplateEntity[]>}
   */
  async getAllWithPagination({ currentPage, perPage, filters, sort }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: {
        ..._.pick(filters, ['id', 'name']),
      },
      sort: [],
    };

    if (typeof filters.name !== 'undefined') {
      sequelizeOptions.filters['name'] = {
        [Sequelize.Op.iLike]: `%${filters.name}%`,
      };
    }

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    const numberTemplateEntities = await this.model.paginate(sequelizeOptions);

    numberTemplateEntities.data = numberTemplateEntities.data.map((item) => this.prepareEntity(item));

    return numberTemplateEntities;
  }

  /**
   * Create number template.
   * @param {NumberTemplateEntity} numberTemplateEntity Number template entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<UnitEntity>}
   */
  async create(numberTemplateEntity, transaction) {
    if (!(numberTemplateEntity instanceof NumberTemplateEntity)) {
      throw new Error('Must be instance of NumberTemplateEntity');
    }

    const [data] = await this.model.upsert(this.prepareForModel(numberTemplateEntity), {
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
    await this.db.query(`drop sequence if exists number_template_sequence_${SqlString.escape(id)};`);
    return await this.model.destroy({
      where: { id },
    });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {NumberTemplateEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new NumberTemplateEntity({
      id: item.id,
      name: item.name,
      template: item.template,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {NumberTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      name: item.name,
      template: item.template,
    };
  }
}

module.exports = NumberTemplateModel;

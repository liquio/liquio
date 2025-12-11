const Sequelize = require('sequelize');
const Model = require('./model');
const LocalizationLanguageEntity = require('../entities/localization_language');

/**
 * Localization language model.
 */
class LocalizationLanguageModel extends Model {
  constructor (dbInstance) {
    super(dbInstance);
    if (!LocalizationLanguageModel.singleton) {

      this.model = this.db.define(
        'localization_language',
        {
          code: {
            type: Sequelize.STRING(5),
            primaryKey: true,
            allowNull: false
          },
          name: {
            type: Sequelize.JSONB,
            allowNull: false
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          meta: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {}
          }
        },
        {
          tableName: 'localization_languages',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );
      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;
    }
  }

  /**
   * Get all.
   * @param {object} params Params.
   * @param {object} params.currentPage Current page.
   * @param {object} params.perPage Per page.
   * @param {object} params.filters Filters.
   * @param {object} params.sort Sort.
   * @returns {Promise<LocalizationLanguageEntity[]>}
   */
  async getAll ({ filters }) {
    const options = {
      where: { 
        is_active: true  // Get active languages only.
      },
      order: [['created_at', 'desc']]
    };

    if (typeof filters.code !== 'undefined') {
      options.where['code'] = filters.code;
    }

    const dbResponse = await this.model.findAll(options);

    const entities = dbResponse.map(this.prepareEntity);
    return entities;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {LocalizationLanguageEntity}
   */
  prepareEntity (item) {
    const { code, name, created_at, updated_at } = item;
    return new LocalizationLanguageEntity({
      code,
      name,
      createdAt: created_at,
      updatedAt: updated_at
    });
  }

  /**
   * Prepare for model.
   * @param {LocalizationLanguageEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    const { code, name,  createdAt, updatedAt } = item;
    return {
      code,
      name,
      created_at: createdAt,
      updated_at: updatedAt
    };
  }
}

module.exports = LocalizationLanguageModel;

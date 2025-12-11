const Sequelize = require('sequelize');
const Model = require('./model');
const LocalizationTextEntity = require('../entities/localization_text');

/**
 * Localization language model.
 */
class LocalizationTextModel extends Model {
  constructor(dbInstance) {
    super(dbInstance);
    if (!LocalizationTextModel.singleton) {

      this.model = this.db.define(
        'localization_text',
        {
          localization_language_code: {
            type: Sequelize.STRING(5),
            primaryKey: true,
            allowNull: false,
            references: {
              model: 'localization_languages',
              key: 'code',
            },
          },
          key: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          value: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
        },
        {
          tableName: 'localization_texts',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
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
   * @returns {Promise<LocalizationTextEntity[]>}
   */
  async getAll({ filters }) {
    const options = {
      where: {},
      order: [['created_at', 'desc']],
    };

    if (typeof filters.localization_language_code !== 'undefined') {
      options.where['localization_language_code'] = filters.localization_language_code;
    }
    if (typeof filters.key !== 'undefined') {
      options.where['key'] = filters.key;
    }

    const dbResponse = await this.model.findAll(options);

    const entities = dbResponse.map(this.prepareEntity);
    return entities;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {LocalizationTextEntity}
   */
  prepareEntity(item) {
    const { localization_language_code, key, value, created_at, updated_at } = item;
    return new LocalizationTextEntity({
      localizationLanguageCode: localization_language_code,
      key,
      value,
      createdAt: created_at,
      updatedAt: updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {LocalizationTextEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    const { localizationLanguageCode, key, value, createdAt, updatedAt } = item;
    return {
      localization_language_code: localizationLanguageCode,
      key,
      value,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  }
}

module.exports = LocalizationTextModel;

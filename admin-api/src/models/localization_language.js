const Sequelize = require('sequelize');
const Model = require('./model');
const LocalizationLanguageEntity = require('../entities/localization_language');
const { SequelizeDbError, SequelizeUniqueConstraintError } = require('../lib/errors');

/**
 * Localization language model.
 */
class LocalizationLanguageModel extends Model {
  // eslint-disable-next-line constructor-super
  constructor(dbInstance) {
    if (!LocalizationLanguageModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'localization_language',
        {
          code: {
            type: Sequelize.STRING(5),
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: Sequelize.JSONB,
            allowNull: false,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          meta: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
        },
        {
          tableName: 'localization_languages',
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
   * Get list with pagination.
   * @param {object} params Params.
   * @param {object} params.currentPage Current page.
   * @param {object} params.perPage Per page.
   * @param {object} params.filters Filters.
   * @param {object} params.sort Sort.
   * @returns {Promise<LocalizationLanguageEntity[]>}
   */
  async getListWithPagination({ currentPage, perPage, filters, sort }) {
    const sequelizeOptions = {
      currentPage,
      perPage,
      filters: {},
      sort: [],
    };

    if (typeof filters.code !== 'undefined') {
      sequelizeOptions.filters['code'] = filters.code;
    }

    const preparedSort = this.prepareSort(sort);
    if (preparedSort.length > 0) {
      sequelizeOptions.sort = preparedSort;
    }

    const dbResponse = await this.model.paginate(sequelizeOptions);

    dbResponse.data = dbResponse.data.map(this.prepareEntity);
    return dbResponse;
  }

  /**
   * Create localization language.
   * @param {object} params Params.
   * @param {object} options Options.
   * @returns {Promise<LocalizationLanguageEntity>}
   */
  async createLocalizationLanguage(params, options = {}) {
    const { person, transaction } = options;

    const meta = {
      createdBy: person || 'system',
    };
    const entityForModel = this.prepareForModel({ ...params, meta });

    let rawDbResponse;
    try {
      rawDbResponse = await this.model.create(entityForModel, { transaction });
    } catch (error) {
      const { name: errorName } = error;
      switch (errorName) {
        case SequelizeUniqueConstraintError.name:
          throw new SequelizeUniqueConstraintError(error);
        case SequelizeDbError.name:
          throw new SequelizeDbError(error);
        default:
          throw error;
      }
    }

    return this.prepareEntity(rawDbResponse);
  }

  /**
   * Update localization language.
   * @param {object} params Params.
   * @param {object} options Options.
   * @returns {Promise<LocalizationLanguageEntity>}
   */
  async updateLocalizationLanguage(params, options = {}) {
    const { code, name, isActive } = params;
    const { person, transaction } = options;
    const metaToAdd = {
      updatedBy: person || 'system',
    };
    const { meta: existingMeta } = await this.model.findOne({
      where: { code },
      attributes: ['meta'],
    });
    const newMeta = { ...existingMeta, ...metaToAdd };

    const dbQueryParams = this.removeUndefinedProperties({ name, isActive, meta: newMeta });
    const entityForModel = this.prepareForModel(dbQueryParams);

    const rawDbResponse = await this.model.update(entityForModel, {
      where: { code },
      returning: true,
      transaction,
    });
    const [updatedRow] = rawDbResponse[1];

    return this.prepareEntity(updatedRow);
  }

  /**
   * Delete localization language.
   * @param {object} params Params.
   * @param {object} options Options.
   * @returns {Promise<number>}
   */
  async deleteLocalizationLanguage({ code }) {
    const result = await this.model.destroy({ where: { code } });

    return result;
  }

  /**
   * Get list (array) by codes.
   * @param {string[]} codes Codes.
   * @returns {Promise<LocalizationLanguageEntity[]>} Localization language entities list promise.
   */
  async getListByCodes(codes) {
    const localizationLanguages = await this.model.findAll({ where: { code: codes } });
    return localizationLanguages.map((item) => this.prepareEntity(item));
  }

  removeUndefinedProperties(rawPreparedStructure = {}) {
    // Remove undefined properties.
    for (const property in rawPreparedStructure) {
      if (rawPreparedStructure[property] === undefined) {
        delete rawPreparedStructure[property];
      }
    }

    // Return prepared structure.
    return rawPreparedStructure;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {LocalizationLanguageEntity}
   */
  prepareEntity(item) {
    const { code, name, is_active, meta, created_at, updated_at } = item;
    return new LocalizationLanguageEntity({
      code,
      name,
      isActive: is_active,
      meta,
      createdAt: created_at,
      updatedAt: updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {LocalizationLanguageEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    const { code, name, isActive, meta, createdAt, updatedAt } = item;
    return {
      code,
      name,
      is_active: isActive,
      meta,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  }
}

module.exports = LocalizationLanguageModel;

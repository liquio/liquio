const Sequelize = require('sequelize');
const Model = require('./model');
const LocalizationTextEntity = require('../entities/localization_text');
const { SequelizeDbError, SequelizeUniqueConstraintError } = require('../lib/errors');

/**
 * Localization language model.
 */
class LocalizationTextModel extends Model {
  // eslint-disable-next-line constructor-super
  constructor(dbInstance) {
    if (!LocalizationTextModel.singleton) {
      super(dbInstance);

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
   * Get list with pagination.
   * @param {object} params Params.
   * @param {object} params.currentPage Current page.
   * @param {object} params.perPage Per page.
   * @param {object} params.filters Filters.
   * @param {object} params.sort Sort.
   * @returns {Promise<LocalizationTextEntity[]>}
   */
  async getListWithPagination({ currentPage, perPage, filters, sort }) {
    const sequelizeOptions = {
      currentPage,
      perPage,
      filters: {},
      sort: [],
    };

    if (typeof filters.localization_language_code !== 'undefined') {
      sequelizeOptions.filters['localization_language_code'] = filters.localization_language_code;
    }
    if (typeof filters.key !== 'undefined') {
      sequelizeOptions.filters.key = {
        [Sequelize.Op.iLike]: `%${filters.key}%`,
      };
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
   * Get list grouped by keys with pagination.
   * @param {object} params Params.
   * @param {object} params.currentPage Current page.
   * @param {object} params.perPage Per page.
   * @param {object} params.filters Filters.
   * @param {object} params.sort Sort.
   * @returns {Promise<[]>}
   */
  async getListByKeysWithPagination({ currentPage, perPage, filters, sort }) {
    // Get keys.
    const getKeysSequelizeOptions = {
      currentPage,
      perPage,
      filters: {},
      sort: [],
      attributes: ['key'],
      group: 'key',
    };
    if (typeof filters.key !== 'undefined') {
      getKeysSequelizeOptions.filters.key = {
        [Sequelize.Op.iLike]: `%${filters.key}%`,
      };
    }
    if (sort.key) {
      const getKeysPreparedSort = this.prepareSort({ key: sort.key });
      if (getKeysPreparedSort.length > 0) {
        getKeysSequelizeOptions.sort = getKeysPreparedSort;
      }
    }
    if (getKeysSequelizeOptions.sort.length === 0) {
      getKeysSequelizeOptions.sort = [['key', 'asc']];
    }
    const keysDbResponse = await this.model.paginate(getKeysSequelizeOptions);
    const keys = keysDbResponse.data.map(({ key }) => key);

    // Get texts by keys.
    const textsRawResponse = await this.model.findAll({
      where: {
        key: {
          [Sequelize.Op.in]: keys,
        },
      },
      order: getKeysSequelizeOptions.sort,
    });
    const textsEntries = textsRawResponse.map(this.prepareEntity);
    keysDbResponse.data = this.agregateTexts(textsEntries);
    return keysDbResponse;
  }

  /**
   * Create localization text.
   * @param {object} params Params.
   * @param {object} options Options.
   * @returns {Promise<LocalizationTextEntity>}
   */
  async createLocalizationText(params, options = {}) {
    const { localizationLanguageCode, key, value } = params;
    const { transaction } = options;
    const entityForModel = this.prepareForModel({ localizationLanguageCode, key, value });
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
   * Update localization text.
   * @param {object} params Params.
   * @param {object} options Options.
   * @returns {Promise<LocalizationTextEntity>}
   */
  async updateLocalizationText(params, options = {}) {
    const { localizationLanguageCode, key, value } = params;
    const { transaction } = options;

    const entityForModel = this.prepareForModel({ value });

    const rawDbResponse = await this.model.update(entityForModel, {
      where: {
        localization_language_code: localizationLanguageCode,
        key,
      },
      returning: true,
      transaction,
    });
    const [updatedRow] = rawDbResponse[1];

    return this.prepareEntity(updatedRow);
  }

  /**
   * Delete localization text.
   * @param {object} params Params.
   * @returns {Promise<number>}
   */
  async deleteLocalizationText({ localizationLanguageCode, key }) {
    const result = await this.model.destroy({
      where: {
        localization_language_code: localizationLanguageCode,
        key,
      },
    });

    return result;
  }

  /**
   * Get list (array) by code and key.
   * @param {object[]} codesKeysList Codes-keys list. [{localizationLanguageCode: 'eng', key: 'Будинок'}, ...]
   * @returns {Promise<string>}
   */
  async getListByCodeAndKey(codesKeysList) {
    const conditions = codesKeysList.map(({ localizationLanguageCode, key }) => ({
      [Sequelize.Op.and]: [{ localization_language_code: localizationLanguageCode }, { key }],
    }));

    const localizationTexts = await this.model.findAll({ where: { [Sequelize.Op.or]: conditions } });
    return localizationTexts.map((item) => this.prepareEntity(item));
  }

  /**
   * Agregate texts by keys.
   * @param {object[]} texts.
   * @returns {Promise<object[]>}
   */
  agregateTexts(texts) {
    const map = texts.reduce((acc, { localizationLanguageCode, key, value }) => {
      acc[key] = {
        ...(acc[key] || {}),
        key: key,
        [localizationLanguageCode]: value,
      };
      return acc;
    }, {});
    return Object.values(map);
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

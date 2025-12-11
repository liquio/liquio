const Entity = require('./entity');

/**
 * Localization language entity.
 */
class LocalizationLanguageEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Options.
   * @param {string} options.code Code.
   * @param {string} options.name Name.
   * @param {string} options.isActive isActive.
   * @param {string} options.meta meta.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ code, name, isActive, meta, createdAt, updatedAt }) {
    super();

    this.code = code;
    this.name = name;
    this.isActive = isActive;
    this.meta = meta;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = LocalizationLanguageEntity;

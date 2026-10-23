import { Entity } from './entity';

/**
 * Localization text entity.
 */
export class LocalizationTextEntity extends Entity {
  localizationLanguageCode: any;
  key: any;
  value: any;
  createdAt: any;
  updatedAt: any;

  /**
   * Constructor.
   * @param {object} options Options.
   * @param {string} options.localizationLanguageCode Localization language code.
   * @param {string} options.key Key.
   * @param {string} options.value Value.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ localizationLanguageCode, key, value, createdAt, updatedAt }) {
    super();

    this.localizationLanguageCode = localizationLanguageCode;
    this.key = key;
    this.value = value;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

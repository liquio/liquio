import { Entity } from './entity';

/**
 * Localization language entity.
 */
export class LocalizationLanguageEntity extends Entity {
  code: any;
  name: any;
  createdAt: any;
  updatedAt: any;

  /**
   * Constructor.
   * @param {object} options Options.
   * @param {string} options.code Code.
   * @param {string} options.name Name.
   * @param {string} options.isActive isActive.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ code, name, createdAt, updatedAt }) {
    super();

    this.code = code;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

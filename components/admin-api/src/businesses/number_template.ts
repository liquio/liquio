import { Exceptions } from '../exceptions';
import { NumberTemplateEntity } from '../entities/number_template';

/**
 * Number Template business.
 */
export class NumberTemplateBusiness {
  private static singleton: NumberTemplateBusiness;

  public config: object;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?) {
    // Define singleton.
    if (!NumberTemplateBusiness.singleton) {
      this.config = config;
      NumberTemplateBusiness.singleton = this;
    }

    // Return singleton.
    return NumberTemplateBusiness.singleton;
  }

  /**
   * Create or update number template.
   * @param {NumberTemplateEntity} numberTemplateEntity Number Template Entity.
   * @returns {Promise<NumberTemplateEntity>}
   */
  async createOrUpdate(numberTemplateEntity) {
    return await global.models.numberTemplate.create(numberTemplateEntity);
  }

  /**
   * Get number templates.
   * @returns {Promise<NumberTemplateEntity[]>}
   */
  async getNumberTemplates(params) {
    return await global.models.numberTemplate.getAllWithPagination({
      ...params,
    });
  }

  /**
   * Delete number template by ID.
   * @param {number} id Number template ID.
   * @returns {Promise<NumberTemplateEntity>}
   */
  async deleteById(id) {
    return await global.models.numberTemplate.deleteById(id);
  }

  /**
   * Find Number template by ID.
   * @param {number} id Number Template ID.
   * @returns {Promise<NumberTemplateEntity>}
   */
  async findById(id) {
    return await global.models.numberTemplate.findById(id);
  }

  /**
   * Export number template.
   * @param {number} id ID.
   * @returns {Promise<string>}
   */
  async export(id) {
    return await global.models.numberTemplate.findById(id);
  }

  /**
   * Import number template.
   * @param {string} data Data.
   * @param {object} params params.
   * @param {object} params.user User.
   * @returns {Promise<boolean>}
   */
  async import(data, { user }) {
    data = JSON.parse(data);

    if (await global.models.numberTemplate.findById(data.id)) {
      throw new Exceptions.COMMITED(Exceptions.COMMITED.Messages.NUMBER_TEMPLATE);
    }

    const numberTemplateTransaction = await global.db.transaction();

    try {
      await global.models.numberTemplate.create(new NumberTemplateEntity(data), numberTemplateTransaction);
      await numberTemplateTransaction.commit();

      global.log.save('user-imported-number-template', { user, data: data });
    } catch (error) {
      await numberTemplateTransaction.rollback();
      throw error;
    }

    return true;
  }
}

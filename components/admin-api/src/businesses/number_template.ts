import { Exceptions } from '../exceptions';
import { NumberTemplateEntity } from '../entities/number_template';
import { toLogUser } from '../lib/log_sanitize';
import { getDb, getLog, getModels } from '../lib/context';

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
    return await getModels().numberTemplate.create(numberTemplateEntity);
  }

  /**
   * Get number templates.
   * @returns {Promise<NumberTemplateEntity[]>}
   */
  async getNumberTemplates(params) {
    return await getModels().numberTemplate.getAllWithPagination({
      ...params,
    });
  }

  /**
   * Delete number template by ID.
   * @param {number} id Number template ID.
   * @returns {Promise<NumberTemplateEntity>}
   */
  async deleteById(id) {
    return await getModels().numberTemplate.deleteById(id);
  }

  /**
   * Find Number template by ID.
   * @param {number} id Number Template ID.
   * @returns {Promise<NumberTemplateEntity>}
   */
  async findById(id) {
    return await getModels().numberTemplate.findById(id);
  }

  /**
   * Export number template.
   * @param {number} id ID.
   * @returns {Promise<string>}
   */
  async export(id) {
    return await getModels().numberTemplate.findById(id);
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

    if (await getModels().numberTemplate.findById(data.id)) {
      throw new Exceptions.COMMITED(Exceptions.COMMITED.Messages.NUMBER_TEMPLATE);
    }

    const numberTemplateTransaction = await getDb().transaction();

    try {
      await getModels().numberTemplate.create(new NumberTemplateEntity(data), numberTemplateTransaction);
      await numberTemplateTransaction.commit();

      getLog().save('user-imported-number-template', { user: toLogUser(user), data: data });
    } catch (error) {
      await numberTemplateTransaction.rollback();
      throw error;
    }

    return true;
  }
}

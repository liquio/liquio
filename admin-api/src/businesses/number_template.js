const Exceptions = require('../exceptions');
const NumberTemplateEntity = require('../entities/number_template');

/**
 * Number Template business.
 */
class NumberTemplateBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
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
    return await models.numberTemplate.create(numberTemplateEntity);
  }

  /**
   * Get number templates.
   * @returns {Promise<NumberTemplateEntity[]>}
   */
  async getNumberTemplates(params) {
    return await models.numberTemplate.getAllWithPagination({
      ...params,
    });
  }

  /**
   * Delete number template by ID.
   * @param {number} id Number template ID.
   * @returns {Promise<NumberTemplateEntity>}
   */
  async deleteById(id) {
    return await models.numberTemplate.deleteById(id);
  }

  /**
   * Find Number template by ID.
   * @param {number} id Number Template ID.
   * @returns {Promise<NumberTemplateEntity>}
   */
  async findById(id) {
    return await models.numberTemplate.findById(id);
  }

  /**
   * Export number template.
   * @param {number} id ID.
   * @returns {Promise<string>}
   */
  async export(id) {
    return await models.numberTemplate.findById(id);
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

    if (await models.numberTemplate.findById(data.id)) {
      throw new Exceptions.COMMITED(Exceptions.COMMITED.Messages.NUMBER_TEMPLATE);
    }

    const numberTemplateTransaction = await db.transaction();

    try {
      await models.numberTemplate.create(new NumberTemplateEntity(data), numberTemplateTransaction);
      await numberTemplateTransaction.commit();

      log.save('user-imported-number-template', { user, data: data });
    } catch (error) {
      await numberTemplateTransaction.rollback();
      throw error;
    }

    return true;
  }
}

module.exports = NumberTemplateBusiness;

const Exceptions = require('../exceptions');
const TaskGroupEntity = require('../entities/task_group');
const TaskTemplateEntity = require('../entities/task_template');
const DocumentTemplateEntity = require('../entities/document_template');

// Constants.
const SEQUELIZE_CONSTRAINT_ERROR = 'SequelizeForeignKeyConstraintError';

/**
 * Task business.
 */
class TaskBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!TaskBusiness.singleton) {
      this.config = config;
      TaskBusiness.singleton = this;
    }

    // Return singleton.
    return TaskBusiness.singleton;
  }

  /**
   * Create or update.
   * @param {TaskGroupEntity} taskGroupEntity Task group Entity.
   * @returns {Promise<TaskGroupEntity>}
   */
  async createOrUpdate(taskGroupEntity) {
    const transaction = await db.transaction();

    try {
      const documentTemplate = await models.documentTemplate.create(
        new DocumentTemplateEntity({ ...taskGroupEntity.documentTemplateEntity }),
        transaction,
      );
      const taskTemplate = await models.taskTemplate.create(new TaskTemplateEntity({ ...taskGroupEntity.taskTemplateEntity }), transaction);

      await transaction.commit();

      return new TaskGroupEntity({
        taskTemplateEntity: taskTemplate,
        documentTemplateEntity: documentTemplate,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete task by ID.
   * @param {number} id Task ID.
   * @returns {Promise<TaskEntity>}
   */
  async deleteById(id) {
    try {
      const taskTemplate = await models.taskTemplate.findById(id);
      const documentTemplate = await models.documentTemplate.findById(taskTemplate.documentTemplateId);

      await models.taskTemplate.deleteById(id);
      await models.documentTemplate.deleteById(documentTemplate.id);
    } catch (error) {
      if (error.name === SEQUELIZE_CONSTRAINT_ERROR) {
        throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.CONSTRAINT);
      }

      throw error;
    }
  }

  /**
   * Find task by ID.
   * @param {number} id Task ID.
   * @returns {Promise<TaskEntity>}
   */
  async findById(id) {
    const taskTemplate = await models.taskTemplate.findById(id);
    if (!taskTemplate) {
      throw new Exceptions.NOT_FOUND(Exceptions.NOT_FOUND.Messages.TASK_TEMPLATE);
    }
    const documentTemplate = await models.documentTemplate.findById(taskTemplate.documentTemplateId);
    if (!documentTemplate) {
      throw new Exceptions.NOT_FOUND(Exceptions.NOT_FOUND.Messages.DOCUMENT_TEMPLATE);
    }

    return new TaskGroupEntity({
      taskTemplateEntity: taskTemplate,
      documentTemplateEntity: documentTemplate,
    });
  }
}

module.exports = TaskBusiness;

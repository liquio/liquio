import { Exceptions } from '../exceptions';
import { TaskGroupEntity } from '../entities/task_group';
import { TaskTemplateEntity } from '../entities/task_template';
import { DocumentTemplateEntity } from '../entities/document_template';
import { getDb, getModels } from '../lib/context';

// Constants.
const SEQUELIZE_CONSTRAINT_ERROR = 'SequelizeForeignKeyConstraintError';

/**
 * Task business.
 */
export class TaskBusiness {
  static singleton: TaskBusiness;

  public config: object;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?: object) {
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
  async createOrUpdate(taskGroupEntity: TaskGroupEntity): Promise<TaskGroupEntity> {
    const transaction = await getDb().transaction();

    try {
      const documentTemplate = await getModels().documentTemplate.create(
        new DocumentTemplateEntity({ ...taskGroupEntity.documentTemplateEntity }),
        transaction,
      );
      const taskTemplate = await getModels().taskTemplate.create(new TaskTemplateEntity({ ...taskGroupEntity.taskTemplateEntity }), transaction);

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
      const taskTemplate = await getModels().taskTemplate.findById(id);
      const documentTemplate = await getModels().documentTemplate.findById(taskTemplate.documentTemplateId);

      await getModels().taskTemplate.deleteById(id);
      await getModels().documentTemplate.deleteById(documentTemplate.id);
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
    const taskTemplate = await getModels().taskTemplate.findById(id);
    if (!taskTemplate) {
      throw new Exceptions.NOT_FOUND(Exceptions.NOT_FOUND.Messages.TASK_TEMPLATE);
    }
    const documentTemplate = await getModels().documentTemplate.findById(taskTemplate.documentTemplateId);
    if (!documentTemplate) {
      throw new Exceptions.NOT_FOUND(Exceptions.NOT_FOUND.Messages.DOCUMENT_TEMPLATE);
    }

    return new TaskGroupEntity({
      taskTemplateEntity: taskTemplate,
      documentTemplateEntity: documentTemplate,
    });
  }
}

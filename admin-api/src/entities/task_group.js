const Entity = require('../entities/entity');
const TaskTemplateEntity = require('../entities/task_template');
const DocumentTemplateEntity = require('../entities/document_template');

/**
 * Task group entity.
 */
class TaskGroupEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Task group object.
   * @param {TaskTemplateEntity} options.taskTemplateEntity Task template entity.
   * @param {DocumentTemplateEntity} options.documentTemplateEntity Document template entity.
   */
  constructor({ taskTemplateEntity, documentTemplateEntity }) {
    super();

    if (!(taskTemplateEntity instanceof TaskTemplateEntity)) {
      throw new Error('Must be instance of TaskTemplateEntity');
    }
    if (!(documentTemplateEntity instanceof DocumentTemplateEntity)) {
      throw new Error('Must be instance of DocumentTemplateEntity');
    }

    this.taskTemplateEntity = taskTemplateEntity;
    this.documentTemplateEntity = documentTemplateEntity;
  }
}

module.exports = TaskGroupEntity;

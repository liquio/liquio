const Entity = require('./entity');

/**
 * Workflow template entity.
 */
class WorkflowTemplateEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow template object.
   * @param {number} options.id ID.
   * @param {number} options.workflowTemplateCategoryId ID.
   * @param {string} options.name Name.
   * @param {string} options.description Status.
   * @param {string} options.xmlBpmnSchema XML BPMN Schema.
   * @param {object} options.data Data.
   * @param {boolean} options.isActive Is active.
   * @param {number} options.workflowStatusId Workflow status ID.
   * @param {number[]} options.accessUnits Access units.
   * @param {{id:string, email:string}[]} options.errorsSubscribers Errors subscribers.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({
    id,
    workflowTemplateCategoryId,
    name,
    description,
    xmlBpmnSchema,
    data,
    isActive,
    workflowStatusId,
    accessUnits,
    errorsSubscribers,
    createdAt,
    updatedAt,
    meta,
    tags,
  }) {
    super();

    this.id = id;
    this.workflowTemplateCategoryId = workflowTemplateCategoryId;
    this.name = name;
    this.description = description;
    this.xmlBpmnSchema = xmlBpmnSchema;
    this.data = data;
    this.isActive = isActive;
    this.workflowStatusId = workflowStatusId;
    this.accessUnits = accessUnits;
    this.errorsSubscribers = errorsSubscribers;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.meta = meta;
    this.tags = tags;
  }

  getFilterProperties() {
    return [
      'id',
      'workflowTemplateCategoryId',
      'entryTaskTemplateIds',
      'workflowTemplateCategory',
      'name',
      'description',
      'xmlBpmnSchema',
      'data',
      'isActive',
      'workflowStatusId',
      'lastWorkflowHistory',
      'accessUnits',
      'errorsSubscribers',
      'createdAt',
      'updatedAt',
      'meta',
    ];
  }

  getFilterPropertiesBrief() {
    return [
      'id',
      'workflowTemplateCategoryId',
      'entryTaskTemplateIds',
      'workflowTemplateCategory',
      'name',
      'description',
      'data',
      'isActive',
      'workflowStatusId',
      'accessUnits',
      'errorsSubscribers',
      'createdAt',
      'updatedAt',
      'meta',
    ];
  }
}

module.exports = WorkflowTemplateEntity;

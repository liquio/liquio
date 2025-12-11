
const Entity = require('./entity');

/**
 * Workflow template entity.
 */
class WorkflowTemplateEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow template object.
   * @param {number} options.id ID.
   * @param {number} options.workflowTemplateCategoryId Workflow template category ID.
   * @param {string} options.name Name.
   * @param {string} options.description Status.
   * @param {string} options.xmlBpmnSchema XML BPMN Schema.
   * @param {object} options.data Data.
   * @param {boolean} options.isActive Is active.
   * @param {{id:string, email:string}[]} options.errorsSubscribers Errors subscribers.
   */
  constructor({ id, workflowTemplateCategoryId, name, description, xmlBpmnSchema, data, isActive, errorsSubscribers }) {
    super();

    this.id = id;
    this.workflowTemplateCategoryId = workflowTemplateCategoryId;
    this.name = name;
    this.description = description;
    this.xmlBpmnSchema = xmlBpmnSchema;
    this.data = data;
    this.isActive = isActive;
    this.errorsSubscribers = errorsSubscribers;
  }

  /**
   * Is only one draft allowed.
   * @returns {boolean} Is only one draft allowed.
   */
  get isOnlyOneDraftAllowed() {
    return !!this.data.isOnlyOneDraftAllowed;
  }

  /**
   * One draft allowed message.
   * @returns {string} One draft allowed message.
   * @example "Only one draft is allowed. Please, finish your draft before creating a new one."
   */
  get oneDraftAllowedMessage() {
    return this.data.oneDraftAllowedMessage;
  }

  /**
   * Get filter properties.
   * @returns {string[]} Filter properties.
   */
  getFilterProperties() {
    return ['id', 'workflowTemplateCategoryId', 'entryTaskTemplateIds', 'workflowTemplateCategory', 'name', 'description', 'isActive'];
  }

  /**
   * Get filter properties brief.
   * @returns {string[]} Filter properties brief.
   */
  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = WorkflowTemplateEntity;

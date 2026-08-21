const Entity = require('./entity');

/**
 * Workflow template entity.
 */
class WorkflowTemplateEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow template object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.description Status.
   * @param {string} options.xmlBpmnSchema XML BPMN Schema.
   * @param {object} options.data Data.
   * @param {boolean} options.isActive Is active.
   * @param {{id:string, email:string}[]} options.errorsSubscribers Errors subscribers.
   */
  constructor({ id, name, description, xmlBpmnSchema, data, isActive, errorsSubscribers }) {
    super();

    this.id = id;
    this.name = name;
    this.description = description;
    this.xmlBpmnSchema = xmlBpmnSchema;
    this.data = data;
    this.isActive = isActive;
    this.errorsSubscribers = errorsSubscribers;
  }
}

module.exports = WorkflowTemplateEntity;

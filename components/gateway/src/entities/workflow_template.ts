import { Entity } from './entity';

/**
 * Workflow template entity.
 */
export class WorkflowTemplateEntity extends Entity {
  id: number;
  name: string;
  description: string;
  xmlBpmnSchema: string;
  data: any;
  isActive: boolean;
  errorsSubscribers: any;

  /**
   * Constructor.
   * @param {object} options Workflow template object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.description Status.
   * @param {string} options.xmlBpmnSchema XML BPMN Schema.
   * @param {object} options.data Data.
   * @param {boolean} options.isActive Is active.
   */
  constructor({ id, name, description, xmlBpmnSchema, data, isActive, errorsSubscribers }: any) {
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

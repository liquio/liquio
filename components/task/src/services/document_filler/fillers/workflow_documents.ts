import PropByPath from 'prop-by-path';
import { Filler } from './filler';
import { TaskModel } from '../../../models/task';

/**
 * Workflow documents filler.
 */
export class WorkflowDocumentsFiller extends Filler {
  private static singleton: WorkflowDocumentsFiller;
  taskModel: any;

  constructor() {
    if (!WorkflowDocumentsFiller.singleton) {
      // Init parent constructor.
      super();

      this.taskModel = new TaskModel();
      WorkflowDocumentsFiller.singleton = this;
    }
    return WorkflowDocumentsFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @param {string} options.workflowId Workflow ID.
   * @param {object} [options.documents] Documents from current workflow.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill: any = {}, options: any = {}) {
    // Get options.
    const { workflowId, documents } = options;

    // Check options.
    if (!workflowId) {
      return objectToFill;
    }

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (!itemSchema || typeof itemSchema.value !== 'string' || !itemSchema.value.startsWith('documents.')) {
        return;
      }

      // Define current value.
      // Sample: "documents.11.data.cancellation.text".
      const currentValue = itemSchema.value;

      // Define documents property path.
      // Sample: "11.data.cancellation.text".
      const documentsPropertyPath = currentValue.split('.').slice(1).join('.');

      // Fill current element.
      let valueToSet;
      try {
        // Prepare documents template IDs.  Sort documents from old to new to get last document with the same template ID.
        // Sample: { 11: { data: { cancellation: { text: "abc" } } } }.
        const documentsByTemplateIds: any = {};
        documents
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .forEach((v) => (documentsByTemplateIds[v.documentTemplateId] = v));

        // Define value to set.
        // Sample: "abc".
        valueToSet = PropByPath.get(documentsByTemplateIds, documentsPropertyPath);
        if (valueToSet === null && itemSchema.allowNull !== true) {
          valueToSet = undefined;
        }
      } catch (error) {
        global.log.save('workflow-document-field-filling-error', error, 'warn');
      }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }
}

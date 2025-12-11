
const Filler = require('./filler');
const TaskModel = require('../../../models/task');

/**
 * Workflow documents function filler.
 */
class WorkflowDocumentsFunctionFiller extends Filler {
  constructor() {
    if (!WorkflowDocumentsFunctionFiller.singleton) {
      // Init parent constructor.
      super();

      this.taskModel = new TaskModel();
      WorkflowDocumentsFunctionFiller.singleton = this;
    }
    return WorkflowDocumentsFunctionFiller.singleton;
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
  async fill(schemaObject, objectToFill = {}, options = {}) {
    // Get options.
    const { workflowId, documents, allProcessDocuments } = options;

    // Check options.
    if (!workflowId) {
      return objectToFill;
    }

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (!itemSchema || typeof itemSchema.documentFunction !== 'string') {
        return;
      }

      // Fill current element.
      let valueToSet;
      try {
        // Process string function.
        valueToSet = this.sandbox.evalWithArgs(
          itemSchema.documentFunction,
          [itemSchema.isCurrentOnly === false ? allProcessDocuments : documents],
          { meta: { fn: 'WorkflowDocumentsFunctionFiller.fill.documentFunction', workflowId } },
        );

        // Check.
        if (valueToSet === null && !itemSchema.allowNull) {
          valueToSet = undefined;
        }
      } catch (error) {
        log.save('workflow-documents-function-field-filling-error', error, 'warn');
      }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }
}

module.exports = WorkflowDocumentsFunctionFiller;

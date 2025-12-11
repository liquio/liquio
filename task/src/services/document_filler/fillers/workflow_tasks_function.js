
const Filler = require('./filler');
const TaskModel = require('../../../models/task');

/**
 * Workflow tasks function filler.
 */
class WorkflowTasksFunctionFiller extends Filler {
  constructor() {
    if (!WorkflowTasksFunctionFiller.singleton) {
      // Init parent constructor.
      super();

      this.taskModel = new TaskModel();
      WorkflowTasksFunctionFiller.singleton = this;
    }
    return WorkflowTasksFunctionFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @param {string} options.workflowId Workflow ID.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill = {}, options = {}) {
    // Get options.
    const { workflowId } = options;

    // Check options.
    if (!workflowId) {
      return objectToFill;
    }

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (!itemSchema || typeof itemSchema.taskFunction !== 'string') {
        return;
      }

      // Fill current element.
      let valueToSet;
      try {
        const tasks = await this.taskModel.getAllByWorkflowId(workflowId);
        valueToSet = this.sandbox.evalWithArgs(
          itemSchema.taskFunction,
          tasks,
          { meta: { fn: 'WorkflowTasksFunctionFiller.fill.taskFunction', workflowId } },
        );

        if (valueToSet === null) {
          valueToSet = undefined;
        }
      } catch (error) {
        log.save('workflow-tasks-function-field-filling-error', error, 'warn');
      }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }
}

module.exports = WorkflowTasksFunctionFiller;


import PropByPath from 'prop-by-path';
import { Filler } from './filler';

/**
 * Workflow filler.
 */
export class WorkflowFiller extends Filler {
  private static singleton: WorkflowFiller;
  constructor() {
    if (!WorkflowFiller.singleton) {
      // Init parent constructor.
      super();

      WorkflowFiller.singleton = this;
    }
    return WorkflowFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @param {string} options.workflowId Workflow ID.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill: any = {}, options: any = {}) {
    // Get options.
    const { workflowId } = options;

    // Check options.
    if (!workflowId) { return objectToFill; }

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (!itemSchema || typeof itemSchema.value !== 'string'
        || !itemSchema.value.startsWith('workflow.')) { return; }

      // Define current value.
      // Sample: "workflow.number".
      const currentValue = itemSchema.value;

      // Define documents property path.
      // Sample: "number".
      const workflowPropertyPath = currentValue.split('.').slice(1).join('.');

      // Fill current element.
      let valueToSet;
      try {
        const workflow = await global.models.workflow.findById(workflowId);
        if (!workflow) { return; }

        // Define value to set.
        valueToSet = PropByPath.get(workflow, workflowPropertyPath);
        if (valueToSet === null) { valueToSet = undefined; }
      } catch (error) { global.log.save('workflow-field-filling-error', error, 'warn'); }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }
}


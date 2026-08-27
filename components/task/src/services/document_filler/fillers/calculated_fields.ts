import jcopy from 'jcopy';
import { Filler } from './filler';

/**
 * Calculated fields filler.
 */
export class CalculatedFieldsFiller extends Filler {
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
    if (!workflowId) {
      return objectToFill;
    }

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be calculated.
      if (!itemSchema || typeof itemSchema.calcBack !== 'string') {
        return;
      }

      // Define current calculation.
      // Sample: `(documentData) => { return !!documentData.someStep.someValue ? 10 : 20; }`.
      const currentCalcBack = itemSchema.calcBack;

      // Fill current element.
      let valueToSet;
      try {
        // Define value to set.
        // Sample: `10`.
        valueToSet = this.sandbox.evalWithArgs(currentCalcBack, [jcopy(objectToFill)], {
          meta: { fn: 'CalculatedFieldsFiller.fill.calcBack', workflowId },
        });
      } catch (error) {
        global.log.save('calculated-field-filling-error', error, 'warn');
      }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }
}

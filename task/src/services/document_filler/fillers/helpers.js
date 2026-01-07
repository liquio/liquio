
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const Filler = require('./filler');

/**
 * Helpers filler.
 */
class HelpersFiller extends Filler {
  constructor() {
    if (!HelpersFiller.singleton) {
      // Init parent constructor.
      super();

      HelpersFiller.singleton = this;
    }
    return HelpersFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @param {string} options.workflowId Workflow ID.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill = {}, _options = {}) {
    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (!itemSchema || typeof itemSchema.value !== 'string'
        || !itemSchema.value.startsWith('helpers.')) { return; }

      // Define current value.
      // Sample: "helpers.uuidv4".
      const currentValue = itemSchema.value;

      // Handle.
      let valueToSet;
      switch (currentValue) {
        case 'helpers.uuidv4':
          valueToSet = randomUUID();
          break;
        case 'helpers.deepLink':
          valueToSet = {
            method: itemSchema.method,
            host: config.persist_link.qrFrontUrl,
            hash: crypto.randomBytes(16).toString('hex'),
          };
          break;
        case 'helpers.frontUrl':
          valueToSet = config.auth.authRedirectUrl;
          break;
        default:
          valueToSet = undefined;
      }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }
}

module.exports = HelpersFiller;

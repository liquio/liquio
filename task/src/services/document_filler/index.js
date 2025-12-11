
const Fillers = require('./fillers');

/**
 * Document filler service.
 */
class DocumentFillerService {
  /**
   * Document filler constructor.
   * @param {object[]} [customFillers] Custom fillers list.
   */
  constructor(customFillers = []) {
    // Define singleton.
    if (!DocumentFillerService.singleton) {
      this.fillers = new Fillers(customFillers);
      DocumentFillerService.singleton = this;
    }
    return DocumentFillerService.singleton;
  }

  /**
   * Fillers list.
   */
  static get FillersList() {
    return Fillers.List;
  }

  /**
   * Fill defined values.
   * @param {object} jsonSchema JSON schema.
   * @param {object} objectToFill Object to fill.
   * @param {object} [options] Filling options.
   * @param {string} [options.workflowId] Workflow ID.
   * @param {string} [options.documentId] Document ID.
   * @param {string} [options.userId] User ID.
   * @param {object} [options.userUnits] User units.
   * @param {object} [options.userUnitsEntities] User units entities.
   * @param {string} [options.oauthToken] OAuth user token.
   */
  async fillDefinedValues(jsonSchema, objectToFill, options) {
    // Fill info.
    await this.fillers.fill(jsonSchema, objectToFill, options);

    // Return filled object.
    return objectToFill;
  }
}

module.exports = DocumentFillerService;

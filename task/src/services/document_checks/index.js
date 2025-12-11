// Imports.
const DisableCreate = require('./checks/disable_create');

// Constants.
const CHECKS_LIST = {
  DisableCreate
};

/**
 * Document check service.
 */
class DocumentChecks {
  /**
   * Document checks constructor.
   * @param {object[]} [customChecks] Custom checks list.
   */
  constructor(customChecks = []) {
    // Define singleton.
    if (!DocumentChecks.singleton) {
      const checksClasses = [...Object.values(DocumentChecks.List), ...customChecks];
      this.initializedChecks = checksClasses.map(v => new v());
      DocumentChecks.singleton = this;
    }
    return DocumentChecks.singleton;
  }

  /**
   * List.
   */
  static get List() {
    return CHECKS_LIST;
  }

  /**
   * Check all.
   * @param {object} jsonSchema JSON schema object.
   * @param {object} documentData Document data that should be checked.
   * @returns {object} commonResult Checks object.
   * @returns {boolean} commonResult.isFailed Checks result.
   * @returns {object} commonResult.checkName Name of failed check.
   * @returns {array} commonResult.checkName.reasons List of errors.
   */
  checkAll(jsonSchema, documentData) {
    const results = [];

    // Run all checks.
    for (const check of this.initializedChecks) {
      results.push(check.check(jsonSchema, documentData));
    }

    // Prepare common result.
    const commonResult = { isFailed: false };
    for (let result of results) {
      if (!result.passed) {
        commonResult.isFailed = true;
        commonResult.message = result.reason;
        break;
      }
    }

    return commonResult;
  }
}

module.exports = DocumentChecks;

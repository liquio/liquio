
const Checks = require('./index');
const Sandbox = require('../../../lib/sandbox');

/**
 * Disable create document service
 * @extends Checks
 */
class DisableCreate extends Checks {
  static sandbox = new Sandbox();

  /**
   * Disable create document check.
   * @param {object} jsonSchema
   * @param {object} documentData.
   * @returns {object} result Check result.
   * @returns {boolean} result.isDocumentPassedChecks.
   * @returns {array} result.reasons.
   */
  check(jsonSchema, documentData) {
    let isDocumentShouldBeDeleted = false;
    let reason;

    // Check that disableCreate is defined.
    if (!jsonSchema.disableCreate) return { passed: true};

    for (let check of jsonSchema.disableCreate) {
      const isCheckPassed = DisableCreate.sandbox.eval(check.checkDelete)(documentData);
      if (!isCheckPassed) {
        isDocumentShouldBeDeleted = true;
        reason = check.errorText;
        break;
      }
    }

    if (isDocumentShouldBeDeleted) return { passed: false, reason };
    return { passed: true };
  }
}

module.exports = DisableCreate;

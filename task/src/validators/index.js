
const { validationResult } = require('express-validator');
const TestValidator = require('./test');
const WorkflowValidator = require('./workflow');
const WorkflowLogValidator = require('./workflow_log');
const TaskValidator = require('./task');
const DocumentValidator = require('./document');
const UserInboxValidator = require('./user_inbox');
const UserValidator = require('./user');
const RegisterValidator = require('./register');
const PaymentValidator = require('./payment');
const ExternalReaderValidator = require('./external_reader');
const CustomValidator = require('./custom');
const CustomInterfaceValidator = require('./custom_interface');
const FavoritesValidator = require('./favorites');
const LocalizationLanguageValidator = require('./localization_language');
const LocalizationTextValidator = require('./localization_text');
const ProtectedFileValidator = require('./protected_file');
const KycValidator = require('./kyc');

class Validators {
  /**
   * Validators constructor.
   * @param {object} config Config object.
   * @param {object} [customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   */
  constructor(config, customValidators = {}) {
    // Define singleton.
    if (!Validators.singleton) {
      this.config = config;
      this.initValidators(customValidators);
      Validators.singleton = this;
    }
    return Validators.singleton;
  }

  /**
   * Init validators.
   * @param {object} [customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   * @private
   */
  initValidators(customValidators = {}) {
    // Define validators classses.
    const validatorsClasses = {
      test: TestValidator,
      workflow: WorkflowValidator,
      workflowLog: WorkflowLogValidator,
      task: TaskValidator,
      document: DocumentValidator,
      userInbox: UserInboxValidator,
      user: UserValidator,
      register: RegisterValidator,
      payment: PaymentValidator,
      externalReader: ExternalReaderValidator,
      custom: CustomValidator,
      customInterface: CustomInterfaceValidator,
      favorites: FavoritesValidator,
      localizationLanguage: LocalizationLanguageValidator,
      localizationText: LocalizationTextValidator,
      protectedFile: ProtectedFileValidator,
      kyc: KycValidator,
      ...customValidators
    };

    // Init validators.
    this.validators = Object.entries(validatorsClasses)
      .map(v => [v[0], new v[1](this.config)])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            let n = {};
            n[v[0]] = v[1];
            return n;
          })()
        }),
        {}
      );
  }

  /**
   * Get handler.
   * @param {string} validatorName Validators name.
   * @param {string} methodName Method name.
   * @returns {function}
   */
  getHandler(validatorName, methodName) {
    // Define validators.
    const validator = this.validators[validatorName];
    if (!validator || !validator[methodName]) {
      return;
    }

    // Return validator schema.
    return validator[methodName]();
  }

  /**
   * Get validation result handler.
   * @param {number} statusCode
   */
  getValidationResultHandler(statusCode = 422) {
    return async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(statusCode).json({ errors: errors.array() });
      }
      next();
    };
  }
}

module.exports = Validators;

const { validationResult } = require('express-validator');

const UserValidator = require('./user');
const RegisterValidator = require('./register');
const BpmnWorkflowValidator = require('./bpmn_workflow');
const WorkflowLogValidator = require('./workflow_log');
const WorkflowValidator = require('./workflow');
const WorkflowProcessValidator = require('./workflow_process');
const WorkflowTagValidator = require('./workflow_tag');
const TaskValidator = require('./task');
const EventValidator = require('./event');
const GatewayValidator = require('./gateway');
const WorkflowCategoryValidator = require('./workflow_category');
const UnitValidator = require('./unit');
const UnitAccessValidator = require('./unit_access');
const NumberTemplateValidator = require('./number_template');
const CustomLogValidator = require('./custom_log');
const AccessHistoryValidator = require('./access_history');
const LoginHistoryValidator = require('./login_history');
const UserAdminActionValidator = require('./user_admin_action');
const UIFilterValidator = require('./ui_filter');
const CustomInterfaceValidator = require('./custom_interface');
const ProxyItemValidator = require('./proxy_item');
const MessageTemplateValidator = require('./message_template');
const sqlReports = require('./sql_reports');
const stat = require('./stat');
const FavoritesValidator = require('./favorites');
const SnippetsValidator = require('./snippets');
const AssetsValidator = require('./assets');
const MassMessagesMailingValidator = require('./mass_messages_mailing');
const LocalizationLanguageValidator = require('./localization_language');
const LocalizationTextValidator = require('./localization_text');
const UserSettingsValidator = require('./user_settings');

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
      user: UserValidator,
      register: RegisterValidator,
      bpmnWorkflow: BpmnWorkflowValidator,
      workflowLog: WorkflowLogValidator,
      workflow: WorkflowValidator,
      workflowProcess: WorkflowProcessValidator,
      workflowTag: WorkflowTagValidator,
      task: TaskValidator,
      event: EventValidator,
      gateway: GatewayValidator,
      workflowCategory: WorkflowCategoryValidator,
      unit: UnitValidator,
      unitAccess: UnitAccessValidator,
      numberTemplate: NumberTemplateValidator,
      customLog: CustomLogValidator,
      accessHistory: AccessHistoryValidator,
      loginHistory: LoginHistoryValidator,
      userAdminAction: UserAdminActionValidator,
      uiFilter: UIFilterValidator,
      customInterface: CustomInterfaceValidator,
      proxyItem: ProxyItemValidator,
      messageTemplate: MessageTemplateValidator,
      sqlReports,
      stat,
      favorites: FavoritesValidator,
      snippets: SnippetsValidator,
      assets: AssetsValidator,
      massMessagesMailing: MassMessagesMailingValidator,
      localizationLanguage: LocalizationLanguageValidator,
      localizationText: LocalizationTextValidator,
      userSettings: UserSettingsValidator,
      ...customValidators,
    };

    // Init validators.
    this.validators = Object.entries(validatorsClasses)
      .map((v) => [v[0], new v[1](this.config)])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            let n = {};
            n[v[0]] = v[1];
            return n;
          })(),
        }),
        {},
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

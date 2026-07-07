import { validationResult } from 'express-validator';

import { Validator } from './validator';
import { UserValidator } from './user';
import { RegisterValidator } from './register';
import { BpmnWorkflowValidator } from './bpmn_workflow';
import { WorkflowLogValidator } from './workflow_log';
import { WorkflowValidator } from './workflow';
import { WorkflowProcessValidator } from './workflow_process';
import { WorkflowTagValidator } from './workflow_tag';
import { TaskValidator } from './task';
import { EventValidator } from './event';
import { GatewayValidator } from './gateway';
import { WorkflowCategoryValidator } from './workflow_category';
import { UnitValidator } from './unit';
import { UnitAccessValidator } from './unit_access';
import { NumberTemplateValidator } from './number_template';
import { CustomLogValidator } from './custom_log';
import { AccessHistoryValidator } from './access_history';
import { LoginHistoryValidator } from './login_history';
import { UserAdminActionValidator } from './user_admin_action';
import { UIFilterValidator } from './ui_filter';
import { CustomInterfaceValidator } from './custom_interface';
import { ProxyItemValidator } from './proxy_item';
import { MessageTemplateValidator } from './message_template';
import { SqlReportsValidator } from './sql_reports';
import { StatValidator } from './stat';
import { FavoritesValidator } from './favorites';
import { SnippetsValidator } from './snippets';
import { AssetsValidator } from './assets';
import { MassMessagesMailingValidator } from './mass_messages_mailing';
import { LocalizationLanguageValidator } from './localization_language';
import { LocalizationTextValidator } from './localization_text';
import { UserSettingsValidator } from './user_settings';

export class Validators {
  static singleton: Validators;
  public config: object;
  public validators: { [key: string]: typeof Validator };

  /**
   * Validators constructor.
   */
  constructor(config: object, customValidators: { [key: string]: typeof Validator } = {}) {
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
   */
  private initValidators(customValidators: { [key: string]: typeof Validator } = {}) {
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
      sqlReports: SqlReportsValidator,
      stat: StatValidator,
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
            n[v[0] as string] = v[1];
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
  getHandler(validatorName: string, methodName: string): (() => any) | undefined {
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
   */
  getValidationResultHandler(statusCode: number = 422) {
    return async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(statusCode).json({ errors: errors.array() });
      }
      next();
    };
  }
}

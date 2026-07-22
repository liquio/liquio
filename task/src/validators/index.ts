
import { validationResult } from 'express-validator';
import { TestValidator } from './test';
import { WorkflowValidator } from './workflow';
import { WorkflowLogValidator } from './workflow_log';
import { TaskValidator } from './task';
import { DocumentValidator } from './document';
import { UserInboxValidator } from './user_inbox';
import { UserValidator } from './user';
import { RegisterValidator } from './register';
import { PaymentValidator } from './payment';
import { ExternalReaderValidator } from './external_reader';
import { CustomValidator } from './custom';
import { CustomInterfaceValidator } from './custom_interface';
import { FavoritesValidator } from './favorites';
import { LocalizationLanguageValidator } from './localization_language';
import { LocalizationTextValidator } from './localization_text';
import { ProtectedFileValidator } from './protected_file';
import { KycValidator } from './kyc';

export class Validators {
  private static singleton: Validators;

  config: any;
  validators: any;

  /**
   * Validators constructor.
   * @param {object} config Config object.
   * @param {object} [customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   */
  constructor(config: any, customValidators: Record<string, any> = {}) {
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
  initValidators(customValidators: Record<string, any> = {}) {
    // Define validators classses.
    const validatorsClasses: Record<string, any> = {
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
            const n: Record<string, any> = {};
            n[v[0] as string] = v[1];
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
  getHandler(validatorName: string, methodName: string) {
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
    return async (req: any, res: any, next: any) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(statusCode).json({ errors: errors.array() });
      }
      next();
    };
  }
}

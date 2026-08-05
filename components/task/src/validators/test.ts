
import { checkSchema } from 'express-validator';
import { Validator } from './validator';

/**
 * Test validator.
 */
export class TestValidator extends Validator {
  private static singleton: TestValidator;

  /**
   * Test validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!TestValidator.singleton) {
      TestValidator.singleton = this;
    }
    return TestValidator.singleton;
  }

  /**
   * Ping schema.
   */
  ping() {
    return checkSchema({
      ['*']: {
        in: ['query'],
        optional: true,
      },
    });
  }

  /**
   * Ping services schema.
   */
  pingServices() {
    return checkSchema({});
  }
}


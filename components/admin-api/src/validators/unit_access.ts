import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Unit access validator.
 */
export class UnitAccessValidator extends Validator {
  static singleton: UnitAccessValidator;

  /**
   * Unit access validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!UnitAccessValidator.singleton) {
      UnitAccessValidator.singleton = this;
    }
    return UnitAccessValidator.singleton;
  }

  /**
   * Schema.
   */
  getUnitAccess() {
    return checkSchema({
      ['unit_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['type']: {
        in: ['query'],
        optional: true,
        isString: true,
        isIn: { options: [['register']] },
      },
    });
  }

  /**
   * Schema.
   */
  findUnitAccessById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  createUnitAccess() {
    return checkSchema({
      ['unitId']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['type']: {
        in: ['body'],
        isString: true,
        isIn: { options: [['register']] },
      },
      ['data']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
    });
  }

  /**
   * Schema.
   */
  updateUnitAccessById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['unitId']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['type']: {
        in: ['body'],
        isString: true,
        isIn: { options: [['register']] },
      },
      ['data']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
    });
  }

  /**
   * Schema.
   */
  deleteUnitAccessById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }
}

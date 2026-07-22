
import { checkSchema } from 'express-validator';
import { Validator } from './validator';

/**
 * External reader validator.
 */
export class ExternalReaderValidator extends Validator {
  private static singleton: ExternalReaderValidator;

  /**
   * External reader validator constructor.
   * @param {object} validationConfig Validadtion config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!ExternalReaderValidator.singleton) {
      ExternalReaderValidator.singleton = this;
    }
    return ExternalReaderValidator.singleton;
  }

  /**
   * Get data.
   */
  getData() {
    return checkSchema({
      ['service']: {
        in: ['body'],
        isString: true,
      },
      ['method']: {
        in: ['body'],
        isString: true,
      },
      ['captchaPayload']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['filters']: {
        in: ['body'],
        custom: {
          options: value => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          }
        }
      }
    });
  }

  /**
   * Get data async
   */
  getDataAsync() {
    return checkSchema({
      ['service']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['method']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['filters']: {
        in: ['body'],
        optional: true,
        custom: {
          options: value => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          }
        }
      },
      ['captchaPayload']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['requestId']: {
        in: ['body'],
        isString: true,
        optional: true,
      }
    });

  }

  /**
   * Get readers.
   */
  getMocksKeysByUser() {
    return checkSchema({
      ['readers']: {
        in: ['query'],
        optional: true
      }
    });
  }
}


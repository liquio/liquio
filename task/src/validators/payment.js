
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Payment validator.
 */
class PaymentValidator extends Validator {
  /**
   * Payment validator constructor.
   * @param {object} validationConfig Validadtion config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!PaymentValidator.singleton) {
      PaymentValidator.singleton = this;
    }
    return PaymentValidator.singleton;
  }

  /**
   * CalculatePaymentData schema.
   */
  calculatePaymentData() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['paymentControlPath']: {
        in: ['body'],
        isString: true
      }
    });
  }

  /**
   * confirmBySmsCode schema.
   */
  confirmBySmsCode() {
    return checkSchema({
      ['paymentControlPath']: {
        in: ['body'],
        isString: true
      },
      ['documentId']: {
        in: ['body'],
        isString: true
      },
      ['code']: {
        in: ['body'],
        isString: true
      }
    });
  }

  /**
   * getReceipt schema.
   */
  getReceipt() {
    return checkSchema({
      ['payment_path']: {
        in: ['query'],
        isString: true
      },
      ['document_id']: {
        in: ['query'],
        isString: true
      },
      ['order_id']: {
        in: ['query'],
        isString: true
      }
    });
  }

  /**
   * validateApplePaySession
   */
  validateApplePaySession() {
    return checkSchema({
      ['validationUrl']: {
        in: ['body'],
        isString: true
      },
      ['displayName']: {
        in: ['body'],
        isString: true
      },
      ['initiative']: {
        in: ['body'],
        isString: true
      },
      ['initiativeContext']: {
        in: ['body'],
        isString: true
      }
    });
  }
}

module.exports = PaymentValidator;

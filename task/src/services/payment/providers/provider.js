// Imports.
const crypto = require('crypto');
const PropByPath = require('prop-by-path');

const Sandbox = require('../../../lib/sandbox');

// Constants.
const TRANSACTION_SEPARATOR = '/';
const BIG_NUMBER_FOR_UNIQUE_ID = 1000000000000000000000000000000000000;

/**
 * Payment provider.
 */
class Provider {
  constructor() {
    this.sandbox = new Sandbox();
  }

  /**
   * Calculate payment data.
   * @abstract
   */
  async calculatePayment() {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * Handle payment status.
   * @abstract
   */
  async handleStatus() {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * Decode payment data.
   * @abstract
   */
  decodePaymentData() {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * Generate transaction ID.
   * @param {string} documentId Document ID.
   * @param {string} paymentControlPath Payment control path.
   * @returns {string} transactionId
   */
  generateTransactionId(documentId, paymentControlPath) {
    const timeStamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('Base64');
    const transactionString = `${documentId}${TRANSACTION_SEPARATOR}${paymentControlPath}${TRANSACTION_SEPARATOR}${timeStamp}${TRANSACTION_SEPARATOR}${randomString}`;
    const transactionId = Buffer.from(transactionString).toString('Base64');

    return transactionId;
  }

  /**
   * Get payment amount.
   * @param {string} document Document ID.
   * @param {string} paymentControlPath Payment control path.
   * @param {Object} jsonSchema Json schema.
   * @param {Object} [options] Options.
   * @param {boolean} [options.isReturnOnlyList] Some providers by API always expect `recipient` param as list of recipients, even if there is only one recipient.
   * @returns {number} paymentAmount
   */
  getPaymentAmount(document, paymentControlPath, jsonSchema, options = {}) {
    const { isReturnOnlyList = false } = options;

    const paymentProperties = PropByPath.get(jsonSchema && jsonSchema.properties, paymentControlPath);
    const recipients = paymentProperties && paymentProperties.recipients;

    if (recipients) {
      return recipients.map(v => {
        let obj = {};
        for (const prop in v) {
          obj[prop] = typeof v[prop] === 'string'
            ? this.sandbox.evalWithArgs(
              v[prop],
              [document],
              { checkArrow: true, meta: { fn: 'Provider.getPaymentAmount', prop } },
            )
            : v[prop];
        }
        return obj;
      }).filter(v => v && v.amount !== 0);
    }

    let paymentFormula = paymentProperties && paymentProperties.amount;
    let descriptionFormula = paymentProperties && paymentProperties.description;
    let orderIdFormula = paymentProperties && paymentProperties.orderId;
    let recipientFormula = paymentProperties && paymentProperties.recipient;
    let payerFormula = paymentProperties && paymentProperties.payer;
    let suffixFormula = paymentProperties && paymentProperties.suffixFormula;
    let orderNumFormula = paymentProperties && paymentProperties.orderNum;

    const amount = this.sandbox.evalWithArgs(
      paymentFormula,
      [document],
      { checkArrow: true, meta: { fn: 'Provider.getPaymentAmount.payment', documentId: document.id } },
    );
    const description = this.sandbox.evalWithArgs(
      descriptionFormula,
      [document],
      { checkArrow: true, meta: { fn: 'Provider.getPaymentAmount.description', documentId: document.id } },
    );
    const orderId = this.sandbox.evalWithArgs(
      orderIdFormula,
      [document],
      { checkArrow: true, meta: { fn: 'Provider.getPaymentAmount.orderId', documentId: document.id } },
    );
    const recipient = this.sandbox.evalWithArgs(
      recipientFormula,
      [document],
      { checkArrow: true, meta: { fn: 'Provider.getPaymentAmount.recipient', documentId: document.id } },
    );
    const payer = this.sandbox.evalWithArgs(
      payerFormula,
      [document],
      { checkArrow: true, meta: { fn: 'Provider.getPaymentAmount.payer', documentId: document.id } },
    );
    const orderIdSuffix = this.sandbox.evalWithArgs(
      suffixFormula,
      [document],
      { checkArrow: true, meta: { fn: 'Provider.getPaymentAmount.suffix', documentId: document.id } },
    );
    const orderNum = this.sandbox.evalWithArgs(
      orderNumFormula,
      [document],
      { checkArrow: true, meta: { fn: 'Provider.getPaymentAmount.orderNum', documentId: document.id } },
    );

    return isReturnOnlyList
      ? [ { recipient, amount, description, orderId, payer, orderIdSuffix, orderNum } ]
      : { recipient, amount, description, orderId, payer, orderIdSuffix, orderNum };
  }

  /**
   * Decode transaction ID.
   * @param {string} transactionId Transaction ID.
   * @returns {{transactionId, documentId, paymentControlPath, timeStamp}} Transaction info.
   */
  decodeTransactionId(transactionId) {
    const decodedString = Buffer.from(transactionId, 'base64').toString('utf8');
    const decodedParts = decodedString.split(TRANSACTION_SEPARATOR);

    // Form transaction data.
    const transactionData = {
      transactionId,
      documentId: decodedParts[0],
      paymentControlPath: decodedParts[1],
      timeStamp: parseInt(decodedParts[2])
    };

    return transactionData;
  }

  /**
   * Form redirect url.
   * @param {{taskId: string}} options (Task Id).
   * @param {object} paymentParams Payment params.
   * @param {string} paymentControlPath Payment control path.
   * @returns {string} redirectUrl.
   */
  formFrontRedirectUrl(options, paymentParams, paymentControlPath) {
    const stepParts = paymentControlPath.split('.');
    const step = stepParts && stepParts[0];
    let { frontRedirectUrl } = paymentParams;
    for (const key in options) {
      const replacePattern = new RegExp(`\\{${key}\\}`, 'g');
      frontRedirectUrl = frontRedirectUrl.replace(replacePattern, options[key]);
    }
    frontRedirectUrl = step ? `${frontRedirectUrl}/${step}` : frontRedirectUrl;

    return frontRedirectUrl;
  }

  /**
   * Send check request.
   * @abstract
   */
  sendCheckRequest() {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * Unhold payment.
   */
  unHoldPayment() {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * Generate unique order id.
   * @returns {string} orderId.
   */
  generateUniqueOrderId() {
    return (Math.random() * BIG_NUMBER_FOR_UNIQUE_ID - 10).toString(36).substr(2, 10).toUpperCase();
  }

  /**
   * Split string to parts.
   * @private
   * @param {string} str String to split.
   * @param {number} partsNumber Number of parts.
   * @param {[]} strPartsArray String parts.
   * @return {[]} strParts.
   */
  splitString(str, partsNumber, strPartsArray) {
    if (str.length === 0) return strPartsArray;

    strPartsArray.push(str.substring(0, partsNumber));
    return this.splitString(str.substring(partsNumber), partsNumber, strPartsArray);
  }

  /**
   * @param {*} value
   * @returns {number}
   */
  parseAmount(value) {
    if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'string') {
      const regex = new RegExp('^[0-9,.]+$');
      if (!regex.test(value)) {
        throw new Error(`Internal Error. Cannot parse amount. Amount: ${value}`);
      }
      value = value.replace(/,/, '.');
      return parseFloat(value);
    } else {
      throw new Error(`Internal Error. Cannot parse amount. Amount: ${value}`);
    }
  }
}

module.exports = Provider;

/**
 * Payment params entity.
 */
class PaymentParamsEntity {
  /**
   * Constructor.
   * @param {object} options
   * @param {string} options.documentId Document ID.
   * @param {string} options.paymentControlPath Payment control path.
   * @param {string} options.transactionId Transaction ID.
   * @param {string} options.paymentAmount Amount to pay.
   * @param {object} options.paymentRequestData Payment request data.
   * @param {object} options.extraData Payment extra data.
   */
  constructor({ documentId, paymentControlPath, transactionId, paymentAmount, paymentRequestData, extraData}) {
    this.documentId = documentId;
    this.paymentControlPath = paymentControlPath;
    this.transactionId = transactionId;
    this.amount = paymentAmount;
    this.paymentRequestData = paymentRequestData;
    this.extraData = extraData;
  }
}

module.exports = PaymentParamsEntity;

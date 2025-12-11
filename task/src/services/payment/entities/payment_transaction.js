/**
 * Payment transaction entity.
 */
class PaymentTransactionEntity {
  /**
   * Constructor.
   * @param {object} options
   * @param {*} options.status Payment status.
   * @param {string} options.statusReceivedAt Status receiving time.
   * @param {string} options.documentId Document ID.
   * @param {string} options.paymentControlPath Payment control path.
   * @param {string} options.transactionId Transaction ID.
   * @param {number} options.amount Amount.
   * @param {string} options.currency Currency.
   * @param {string} options.createDate Create date.
   * @param {number} [options.errCode] Error code.
   * @param {string} [options.errDescription] Error description.
   * @param {object} [options.extraData] Extra data.
   */
  constructor({
    status,
    statusReceivedAt,
    documentId,
    paymentControlPath,
    transactionId,
    amount,
    currency,
    createDate,
    errCode,
    errDescription,
    extraData,
  }) {
    this.status = status;
    this.statusReceivedAt = statusReceivedAt;
    this.documentId = documentId;
    this.paymentControlPath = paymentControlPath;
    this.transactionId = transactionId;
    this.amount = amount;
    this.currency = currency;
    this.createDate = createDate;
    this.errCode = errCode;
    this.errDescription = errDescription;
    this.extraData = extraData;
  }
}

module.exports = PaymentTransactionEntity;

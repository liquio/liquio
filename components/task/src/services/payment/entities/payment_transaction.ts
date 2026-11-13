/**
 * Payment transaction entity.
 *
 * Binds documentId/paymentControlPath/taskId/workflowId to a short opaque id (see
 * `PaymentTransactionsModel`), so a payment provider whose redirect URL has a length limit can
 * carry just this id instead of embedding those fields directly in the URL - see
 * `TaskPaymentTransactionService` (`@liquio/plugin-sdk`) for the provider-facing contract this
 * backs.
 */
export class PaymentTransactionEntity {
  id: string;
  documentId: string;
  paymentControlPath: string;
  taskId: string;
  workflowId: string;
  extraData: any;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Constructor.
   * @param {object} options
   * @param {string} options.id Transaction ID.
   * @param {string} options.documentId Document ID.
   * @param {string} options.paymentControlPath Payment control path.
   * @param {string} [options.taskId] Task ID.
   * @param {string} [options.workflowId] Workflow ID.
   * @param {object} [options.extraData] Extra data.
   * @param {Date} [options.createdAt] Create date.
   * @param {Date} [options.updatedAt] Update date.
   */
  constructor({ id, documentId, paymentControlPath, taskId, workflowId, extraData, createdAt, updatedAt }) {
    this.id = id;
    this.documentId = documentId;
    this.paymentControlPath = paymentControlPath;
    this.taskId = taskId;
    this.workflowId = workflowId;
    this.extraData = extraData;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

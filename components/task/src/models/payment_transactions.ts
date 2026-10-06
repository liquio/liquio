import Sequelize from 'sequelize';

import { Model } from './model';
import { PaymentTransactionEntity } from '../services/payment/entities/payment_transaction';

/**
 * Payment transactions model.
 *
 * Backs `TaskPaymentTransactionService` (see `src/app.ts`, wired into `PluginLoader`'s
 * `contextExtensions`) - a payment provider never touches this model or `global.db` directly, it
 * only ever calls the service methods exposed on its `PluginContext`.
 */
export class PaymentTransactionsModel extends Model {
  private static singleton: PaymentTransactionsModel;

  model: any;

  constructor() {
    if (!PaymentTransactionsModel.singleton) {
      super();

      this.model = this.db.define(
        'payment_transactions',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
          document_id: { type: Sequelize.STRING, allowNull: false },
          payment_control_path: { type: Sequelize.STRING, allowNull: false },
          task_id: { type: Sequelize.STRING, allowNull: true },
          workflow_id: { type: Sequelize.STRING, allowNull: true },
          extra_data: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
        },
        {
          tableName: 'payment_transactions',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      PaymentTransactionsModel.singleton = this;
    }

    return PaymentTransactionsModel.singleton;
  }

  /**
   * Persist a payment transaction record.
   * @param {object} data
   * @param {string} data.documentId Document ID.
   * @param {string} data.paymentControlPath Payment control path.
   * @param {string} [data.taskId] Task ID.
   * @param {string} [data.workflowId] Workflow ID.
   * @param {object} [data.extraData] Extra data.
   * @returns {Promise<string>} The persisted transaction's id.
   */
  async create({
    documentId,
    paymentControlPath,
    taskId,
    workflowId,
    extraData,
  }: {
    documentId: string;
    paymentControlPath: string;
    taskId?: string;
    workflowId?: string;
    extraData?: Record<string, any>;
  }): Promise<string> {
    const row = await this.model.create({
      document_id: documentId,
      payment_control_path: paymentControlPath,
      task_id: taskId,
      workflow_id: workflowId,
      extra_data: extraData ?? {},
    });
    return row.get('id');
  }

  /**
   * Find a payment transaction by id.
   * @param {string} id Transaction ID.
   * @returns {Promise<PaymentTransactionEntity|null>}
   */
  async findById(id: string): Promise<PaymentTransactionEntity | null> {
    if (!id) return null;

    const row = await this.model.findByPk(id);
    if (!row) return null;

    const {
      id: rowId,
      document_id: documentId,
      payment_control_path: paymentControlPath,
      task_id: taskId,
      workflow_id: workflowId,
      extra_data: extraData,
      created_at: createdAt,
      updated_at: updatedAt,
    } = row.get({ plain: true });

    return new PaymentTransactionEntity({ id: rowId, documentId, paymentControlPath, taskId, workflowId, extraData, createdAt, updatedAt });
  }
}

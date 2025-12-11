const Sequelize = require('sequelize');
const Model = require('./model');

class PaymentLogsModel extends Model {
  constructor() {
    if (!PaymentLogsModel.singleton) {
      super();

      this.model = this.db.define(
        'payment_logs',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          transaction_id: { type: Sequelize.STRING },
          payment_action: Sequelize.ENUM('raw', 'processed'),
          data: { type: Sequelize.JSON, defaultValue: {} },
        },
        {
          tableName: 'payment_logs',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      PaymentLogsModel.singleton = this;
    }

    return PaymentLogsModel.singleton;
  }

  /**
   * Save logs data.
   * @param {object} data Data object.
   * @param {string} data.transactionId Transaction ID.
   * @param {number} data.paymentAction Payment action.
   * @param {number} data.paymentData Payment data.
   * @returns {Promise<boolean>} isSaved boolean flag.
   */
  async save({ transactionId, paymentAction, paymentData }) {
    const paymentInfo = this.prepareForModel({ transactionId, paymentAction, paymentData });
    const rawDbResponse = await this.model.create(paymentInfo);
    const { dataValues } = rawDbResponse;
    const isSaved = dataValues && dataValues.id ? 1 : 0;
    return isSaved;
  }

  /**
   * Prepare for model.
   * @param {DocumentEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      transaction_id: item.transactionId,
      payment_action: item.paymentAction,
      data: item.paymentData
    };
  }
}

module.exports = PaymentLogsModel;

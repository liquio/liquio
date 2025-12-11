const AbstractDB = require('./DB');

const SmsQueueModel = class extends AbstractDB {
  constructor() {
    super();
    this.smsQueue = this.sequelize.define(
      'sms_queue',
      {
        sms_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        message_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'incomming_messages',
            key: 'message_id',
          },
        },
        communication_id: {
          type: this.DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'communications',
            key: 'communication_id',
          },
        },
        phone: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
        status: {
          type: this.DataTypes.ENUM('waiting', 'sended', 'rejected'),
          allowNull: false,
          defaultValue: 'waiting',
        },
        forced: {
          type: this.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        underscored: true,
        tableName: 'sms_queue',
      },
    );
  }
  get SmsQueue() {
    return this.smsQueue;
  }
};

module.exports = SmsQueueModel;

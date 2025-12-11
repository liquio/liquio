const AbstractDB = require('./DB');

const MailQueueModel = class extends AbstractDB {
  constructor() {
    super();
    this.mailQueue = this.sequelize.define(
      'mail_queue',
      {
        mail_id: {
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
        email: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'mail_queue',
      },
    );
  }
  get MailQueue() {
    return this.mailQueue;
  }
};

module.exports = MailQueueModel;

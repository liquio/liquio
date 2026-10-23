import { AbstractDB } from './DB';

export class MailQueueModel extends AbstractDB {
  mailQueue: any;

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
  get MailQueue(): any {
    return this.mailQueue;
  }
}

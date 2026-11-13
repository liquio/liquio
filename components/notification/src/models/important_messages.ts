import { AbstractDB } from './DB';
import { IncommingMessagesModel } from './incomming_messages';
import { UsersMessagesModel } from './users_messages';

const IncommingMessages = new IncommingMessagesModel().IncommingMessages;
const UsersMessages = new UsersMessagesModel().UsersMessages;

export class ImportantMessagesModel extends AbstractDB {
  messages: any;

  constructor() {
    super();
    this.messages = this.sequelize.define(
      'important_messages',
      {
        user_message_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users_messages',
            key: 'user_message_id',
          },
        },
        message_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'incomming_messages',
            key: 'message_id',
          },
        },
        is_active: this.DataTypes.BOOLEAN,
        allow_hide: this.DataTypes.BOOLEAN,
        expired_at: this.DataTypes.DATE,
      },
      {
        underscored: true,
        tableName: 'important_messages',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );

    this.messages.belongsTo(IncommingMessages, { foreignKey: 'message_id' });
    this.messages.belongsTo(UsersMessages, { foreignKey: 'user_message_id' });
  }

  get ImportantMessages(): any {
    return this.messages;
  }
}

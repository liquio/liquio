const AbstractDB = require('./DB');
const IncommingMessagesModel = require('./incomming_messages');
const IncommingMessages = new IncommingMessagesModel().IncommingMessages;

const UsersMessagesModel = class extends AbstractDB {
  constructor() {
    super();
    this.usersMessages = this.sequelize.define(
      'users_messages',
      {
        user_message_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
        message_id: {
          type: this.DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'incomming_messages',
            key: 'message_id',
          },
        },
        event_id: {
          type: this.DataTypes.INTEGER,
          allowNull: true,
        },
        is_read: {
          type: this.DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        show_to_all: {
          type: this.DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'users_messages',
      },
    );

    this.usersMessages.belongsTo(IncommingMessages, { foreignKey: 'message_id' });
  }

  get UsersMessages() {
    return this.usersMessages;
  }
};

module.exports = UsersMessagesModel;

const AbstractDB = require('./DB');
const EventsModel = require('./events');
const MessageCryptTypesModel = require('./message_crypt_types');

const Events = new EventsModel().Events;
const MessageCryptTypes = new MessageCryptTypesModel().MessageCryptTypes;

const IncommingMessagesModel = class extends AbstractDB {
  constructor() {
    super();
    this.incommingMessages = this.sequelize.define(
      'incomming_messages',
      {
        message_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        workflow_id: {
          type: this.DataTypes.INTEGER,
          allowNull: true,
        },
        user_ipn: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        address: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        list_user_id: {
          type: this.DataTypes.ARRAY(this.DataTypes.STRING),
          allowNull: true,
        },
        list_place_id: {
          type: this.DataTypes.ARRAY(this.DataTypes.STRING),
          allowNull: true,
        },
        list_phone: {
          type: this.DataTypes.ARRAY(this.DataTypes.STRING),
          allowNull: true,
        },
        list_email: {
          type: this.DataTypes.ARRAY(this.DataTypes.STRING),
          allowNull: true,
        },
        event_id: {
          type: this.DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'events',
            key: 'event_id',
          },
        },
        short_message: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        short_message_translit: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        medium_message: {
          type: this.DataTypes.TEXT,
          allowNull: true,
        },
        title_message: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        full_message: {
          type: this.DataTypes.TEXT,
          allowNull: true,
        },
        processing_id: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        date_create: {
          type: this.DataTypes.DATE,
          allowNull: true,
        },
        message_crypt_type_id: {
          type: this.DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'message_crypt_types',
            key: 'id',
          },
        },
        is_encrypted: {
          type: this.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        decrypted_base64: {
          type: this.DataTypes.TEXT,
          allowNull: true,
        },
        client_id: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        sender: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        meta: {
          type: this.DataTypes.JSON,
          allowNull: false,
          defaultValue: {},
        },
      },
      {
        timestamps: false,
        tableName: 'incomming_messages',
      },
    );
    this.incommingMessages.belongsTo(Events, { foreignKey: 'event_id' });
    this.incommingMessages.belongsTo(MessageCryptTypes, { foreignKey: 'message_crypt_type_id', targetKey: 'id' });
  }

  get IncommingMessages() {
    return this.incommingMessages;
  }
};

module.exports = IncommingMessagesModel;

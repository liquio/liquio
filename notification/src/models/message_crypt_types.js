const AbstractDB = require('./DB');

/**
 * Message crypt types model.
 */
const MessageCryptTypesModel = class extends AbstractDB {
  constructor() {
    super();
    this.messageCryptTypes = this.sequelize.define(
      'message_crypt_types',
      {
        id: {
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
          type: this.DataTypes.INTEGER,
        },
        name: {
          allowNull: false,
          type: this.DataTypes.STRING,
        },
        rule_to_show: {
          allowNull: false,
          type: this.DataTypes.TEXT,
          defaultValue: '(decryptedBase64) => Buffer.from(decryptedBase64, \'base64\').toString(\'utf8\');',
        },
        created_at: {
          allowNull: false,
          type: this.DataTypes.DATE,
          defaultValue: this.sequelize.literal('NOW()'),
        },
        updated_at: {
          allowNull: false,
          type: this.DataTypes.DATE,
          defaultValue: this.sequelize.literal('NOW()'),
        },
      },
      {
        timestamps: false,
        tableName: 'message_crypt_types',
      },
    );
  }

  get MessageCryptTypes() {
    return this.messageCryptTypes;
  }
};

module.exports = MessageCryptTypesModel;

const AbstractDB = require('./DB');
let { _conf } = global;
const _MailerModel = require('./emailGate/mailerModel');

const TemplatesModel = class extends AbstractDB {
  constructor() {
    super();
    this.defineModel();
  }

  async defineModel() {
    this.templates = this.sequelize.define(
      'templates',
      {
        template_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        type: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
        text: {
          type: this.DataTypes.TEXT,
          allowNull: false,
        },
        title: {
          type: this.DataTypes.TEXT,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'templates',
      },
    );
  }

  get Templates() {
    return this.templates;
  }
};

module.exports = TemplatesModel;

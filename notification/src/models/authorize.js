const AbstractDB = require('./DB');

const AuthorizeModel = class extends AbstractDB {
  constructor() {
    super();
    this.authorize = this.sequelize.define(
      'authorize',
      {
        authorize_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        login: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
        password: {
          type: this.DataTypes.TEXT,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'authorize',
      },
    );
  }

  get Authorize() {
    return this.authorize;
  }
};

module.exports = AuthorizeModel;

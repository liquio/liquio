const AbstractDB = require('./DB');

const ConfigsModel = class extends AbstractDB {
  constructor() {
    super();
    this.configs = this.sequelize.define(
      'configs',
      {
        id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        environment: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
        info: {
          type: this.DataTypes.JSON,
          allowNull: false,
        },
      },
      {
        timestamps: true,
        createdAt: false,
        updatedAt: 'updated_at',
        tableName: 'configs',
      },
    );
  }
  get Configs() {
    return this.configs;
  }
};

module.exports = ConfigsModel;

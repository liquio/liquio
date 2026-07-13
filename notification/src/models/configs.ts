import { AbstractDB } from './DB';

export class ConfigsModel extends AbstractDB {
  configs: any;

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
  get Configs(): any {
    return this.configs;
  }
}

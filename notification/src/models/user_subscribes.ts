import { AbstractDB } from './DB';

export class UserSubscribesModel extends AbstractDB {
  userSubscribes: any;

  constructor() {
    super();
    this.userSubscribes = this.sequelize.define(
      'user_subscribes',
      {
        subscribe_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        setting_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'settings',
            key: 'setting_id',
          },
        },
        user_id: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'user_subscribes',
      },
    );
  }

  get UserSubscribes(): any {
    return this.userSubscribes;
  }
}

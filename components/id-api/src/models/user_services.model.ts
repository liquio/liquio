import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface UserServicesAttributes {
  id: number;
  userId: string;
  provider: string;
  provider_id: string;
  data: unknown;
}

export type UserServicesCreationAttributes = Omit<UserServicesAttributes, 'id'>;

export class UserServicesModel extends BaseModel<UserServicesAttributes, UserServicesCreationAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'user_services',
      {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: DataTypes.STRING(24),
          allowNull: false,
          references: {
            model: 'users',
            key: 'userId',
          },
        },
        provider: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        provider_id: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        data: {
          type: DataTypes.JSON,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'user_services',
      },
    );
  }
}

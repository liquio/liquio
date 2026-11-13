import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface UserOldDataAttributes {
  id: number;
  userId: string;
  oldPhone?: string;
  oldEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserOldDataCreationAttributes = Omit<UserOldDataAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class UserOldDataModel extends BaseModel<UserOldDataAttributes, UserOldDataCreationAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'user_old_data',
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.STRING(24),
          allowNull: false,
          references: {
            model: 'users',
            key: 'userId',
          },
        },
        oldPhone: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        oldEmail: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        tableName: 'user_old_data',
      },
    );
  }
}

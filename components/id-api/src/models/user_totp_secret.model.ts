import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface UserTotpSecretAttributes {
  userId: string;
  secret: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserTotpSecretCreationAttributes = Omit<UserTotpSecretAttributes, 'createdAt' | 'updatedAt'>;

export class UserTotpSecretModel extends BaseModel<UserTotpSecretAttributes, UserTotpSecretCreationAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define('user_totp_secrets', {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: { model: 'users', key: 'userId' },
      },
      secret: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: this.sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: this.sequelize.literal('NOW()'),
      },
    });
  }
}

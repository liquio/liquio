import { BaseModel, DataTypes, Sequelize } from './base_model';

export type LoginActionType = 'login' | 'logout' | 'change_password';

export interface LoginHistoryAttributes {
  id: string;
  created_at: Date;
  user_id: string;
  user_name?: string;
  ip: string[];
  user_agent?: string;
  client_id: string;
  client_name?: string;
  is_blocked: boolean;
  action_type: LoginActionType;
}

export type LoginHistoryCreationAttributes = Omit<LoginHistoryAttributes, 'id' | 'created_at'>;

/**
 * Login history model.
 */
export class LoginHistoryModel extends BaseModel<LoginHistoryAttributes, LoginHistoryCreationAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'login_history',
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV1,
        },
        created_at: {
          allowNull: false,
          type: DataTypes.DATE,
          defaultValue: this.sequelize.literal('NOW()'),
        },
        user_id: {
          allowNull: false,
          type: DataTypes.STRING,
          references: {
            model: 'users',
            key: 'userId',
          },
        },
        user_name: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        ip: {
          allowNull: false,
          type: DataTypes.ARRAY(DataTypes.STRING),
          defaultValue: [],
        },
        user_agent: {
          allowNull: true,
          type: DataTypes.TEXT,
        },
        client_id: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        client_name: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        is_blocked: {
          allowNull: false,
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        action_type: {
          allowNull: false,
          type: DataTypes.ENUM,
          values: ['login', 'logout'],
          defaultValue: 'login',
        },
      },
      {
        timestamps: false,
        tableName: 'login_history',
      },
    );
  }
}

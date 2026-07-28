import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface UserAdminActionAttributes {
  id: string;
  user_id: string;
  data: string;
  created_by: string;
  action_type: 'delete' | 'block' | 'unblock';
}

export type UserAdminActionCreationAttributes = Omit<UserAdminActionAttributes, 'id' | 'created_at' | 'updated_at'>;

/**
 * User_admin_action model.
 */
export class UserAdminActionModel extends BaseModel<UserAdminActionAttributes, UserAdminActionCreationAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'user_admin_actions',
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV1,
        },
        user_id: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        data: {
          allowNull: false,
          type: DataTypes.JSONB,
        },
        created_by: {
          allowNull: false,
          type: DataTypes.JSONB,
        },
        action_type: {
          allowNull: false,
          type: DataTypes.ENUM,
          values: ['delete', 'block', 'unblock'],
          defaultValue: 'delete',
        },
      },
      {
        tableName: 'user_admin_actions',
        underscored: true,
        createdAt: 'created_at',
        updatedAt: false,
      },
    );
  }
}

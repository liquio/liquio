import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface AuthCodeAttributes {
  code: string;
  clientId: string;
  expires: Date;
  userId: string;
  scope: string[];
}

/**
 * Auth code model.
 */
export class AuthCodeModel extends BaseModel<AuthCodeAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'auth_codes',
      {
        code: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
        },
        clientId: {
          allowNull: false,
          type: DataTypes.STRING,
          references: {
            model: 'clients',
            key: 'clientId',
          },
        },
        expires: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        userId: {
          type: DataTypes.STRING(24),
          allowNull: false,
          references: {
            model: 'users',
            key: 'userId',
          },
        },
        scope: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
      },
      {
        timestamps: false,
        tableName: 'auth_codes',
      },
    );
  }

  async init() {
    this.entity.belongsTo(this.model('user'), { foreignKey: 'userId' });
    this.entity.belongsTo(this.model('client'), {
      foreignKey: 'clientId',
    });
  }
}

import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface AuthCodeAttributes {
  code: string;
  clientId: string;
  expires: Date;
  userId: string;
  scope: string[];
  redirectUri?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
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
        redirectUri: { type: DataTypes.TEXT, allowNull: true },
        codeChallenge: { type: DataTypes.STRING(128), allowNull: true },
        codeChallengeMethod: { type: DataTypes.STRING, allowNull: true },
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

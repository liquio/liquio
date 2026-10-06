import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface AccessTokenAttributes {
  accessToken: string;
  clientId: number;
  expires: Date;
  userId: string;
  scope: string[];
}

/**
 * Access token model for OAuth2.
 */
export class AccessTokenModel extends BaseModel<AccessTokenAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'access_tokens',
      {
        accessToken: {
          type: DataTypes.UUIDV1,
          primaryKey: true,
          allowNull: false,
        },
        clientId: {
          allowNull: false,
          type: DataTypes.INTEGER,
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
        tableName: 'access_tokens',
      },
    );
  }

  async init() {
    this.entity.belongsTo(this.model('user'), { foreignKey: 'userId' });
    this.entity.belongsTo(this.model('client'), { foreignKey: 'clientId' });
  }
}

import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface RefreshTokenAttributes {
  refreshToken: string;
  clientId: number;
  expires: Date;
  userId: string;
}

export class RefreshTokenModel extends BaseModel<RefreshTokenAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'refresh_tokens',
      {
        refreshToken: {
          allowNull: false,
          type: DataTypes.STRING,
          primaryKey: true,
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
      },
      {
        timestamps: false,
        tableName: 'refresh_tokens',
      },
    );
  }

  async init() {
    this.entity.belongsTo(this.model('user'), {
      foreignKey: 'userId',
    });
    this.entity.belongsTo(this.model('client'), {
      foreignKey: 'clientId',
    });
  }
}

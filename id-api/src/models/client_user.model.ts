import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface ClientUserAttributes {
  id: number;
  clientId: string;
  userId: string;
  scope: string[];
}

export type ClientUserCreationAttributes = Omit<ClientUserAttributes, 'id'>;

export class ClientUserModel extends BaseModel<ClientUserAttributes, ClientUserCreationAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'clients_users',
      {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        clientId: {
          allowNull: false,
          type: DataTypes.STRING,
          references: {
            model: 'clients',
            key: 'clientId',
          },
        },
        userId: {
          type: DataTypes.STRING(24),
          allowNull: false,
          references: {
            model: 'users',
            key: 'userId',
          },
        },
        scope: DataTypes.ARRAY(DataTypes.STRING),
      },
      {
        timestamps: false,
        tableName: 'clients_users',
      },
    );
  }

  async init() {
    this.entity.belongsTo(this.model('client'), {
      foreignKey: 'clientId',
    });
  }
}

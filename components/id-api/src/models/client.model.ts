import { BaseModel, DataTypes, Sequelize } from './base_model';
import { loadConfig } from '../config';

export interface ClientAttributes {
  clientId: string;
  secret?: string;
  need_secret: boolean;
  requirements?: string[];
  redirectUri: string[];
  grants?: string[];
  scope?: string[];
  client_name: string;
  need_scope_approve: boolean;
}

/**
 * A Client model for the OAuth clients: services that connect via OAuth2 protocol.
 */
export class ClientModel extends BaseModel<ClientAttributes> {
  private static isVerified = false;

  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'clients',
      {
        clientId: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        secret: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        need_secret: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        requirements: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
        },
        redirectUri: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
        },
        grants: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          defaultValue: ['authorization_code'],
        },
        scope: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
        client_name: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'Unnamed client',
        },
        need_scope_approve: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        timestamps: false,
        tableName: 'clients',
      },
    );
  }

  async init() {
    if (!ClientModel.isVerified) {
      ClientModel.isVerified = true;

      const authConf = loadConfig().oauth;
      const clientId = authConf?.defaults?.client_id;
      const clientName = authConf?.defaults?.client_name ?? 'client';
      const redirectUri = authConf?.defaults?.redirect_uri || [];
      const scope = authConf?.defaults?.scope;

      if (!clientId) {
        throw new Error('Default client ID is not defined');
      }

      await this.entity.findOrCreate({
        where: { clientId },
        defaults: {
          clientId,
          client_name: clientName,
          need_scope_approve: true,
          secret: authConf?.secret_key![0],
          redirectUri,
          grants: ['authorization_code'],
          need_secret: false,
          scope,
        },
      });
    }
  }
}

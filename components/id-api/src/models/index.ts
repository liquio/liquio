import NodeCache from 'node-cache';
import { Dialect, Sequelize, Options as SequelizeOptions } from 'sequelize';

export { WhereAttributeHash, WhereOptions } from 'sequelize';
export { AccessTokenAttributes } from './access_token.model';
export { AuthCodeAttributes } from './auth_code.model';
export { ClientAttributes } from './client.model';
export { ClientUserAttributes, ClientUserCreationAttributes } from './client_user.model';
export { ConfirmCodeAttributes, ConfirmCodeCreationAttributes } from './confirm_code.model';
export { LoginActionType, LoginHistoryAttributes, LoginHistoryCreationAttributes } from './login_history.model';
export { RefreshTokenAttributes } from './refresh_token.model';
export { SessionsAttributes } from './sessions.model';
export { UserAttributes, UserCreationAttributes } from './user.model';
export { UserAdminActionAttributes, UserAdminActionCreationAttributes } from './user_admin_action.model';
export { UserOldDataAttributes, UserOldDataCreationAttributes } from './user_old_data.model';
export { UserServicesAttributes, UserServicesCreationAttributes } from './user_services.model';
export { UserTotpSecretAttributes, UserTotpSecretCreationAttributes } from './user_totp_secret.model';

import { Config } from '../config';
import { Log } from '../lib/log';
import { AccessTokenModel } from './access_token.model';
import { AuthCodeModel } from './auth_code.model';
import { BaseModel } from './base_model';
import { ClientModel } from './client.model';
import { ClientUserModel } from './client_user.model';
import { ConfirmCodeModel } from './confirm_code.model';
import { LoginHistoryModel } from './login_history.model';
import { RefreshTokenModel } from './refresh_token.model';
import { SessionsModel } from './sessions.model';
import { UserModel } from './user.model';
import { UserAdminActionModel } from './user_admin_action.model';
import { UserOldDataModel } from './user_old_data.model';
import { UserServicesModel } from './user_services.model';
import { UserTotpSecretModel } from './user_totp_secret.model';

export interface DatabaseConfiguration {
  database: string;
  username: string;
  password: string;
  host: string;
  port: number;
  dialect?: Dialect;
  logging: boolean;
  ssl?: boolean;
  dialectOptions?: any;
}

export interface ModelsCollection {
  accessToken: AccessTokenModel;
  authCode: AuthCodeModel;
  client: ClientModel;
  clientUser: ClientUserModel;
  confirmCode: ConfirmCodeModel;
  loginHistory: LoginHistoryModel;
  refreshToken: RefreshTokenModel;
  sessions: SessionsModel;
  userAdminAction: UserAdminActionModel;
  user: UserModel;
  userOldData: UserOldDataModel;
  userServices: UserServicesModel;
  userTotpSecret: UserTotpSecretModel;
}

export class Models {
  private static singleton: Models;

  private readonly sequelize!: Sequelize;
  private readonly log!: Log;

  public readonly models!: ModelsCollection;
  private readonly nodeCache!: NodeCache;

  constructor(private readonly config: Config['db']) {
    if (Models.singleton) {
      throw new Error('Models already initialized.');
    }

    this.log = Log.get();

    const options: SequelizeOptions = {
      host: config.host,
      port: config.port,
      dialect: config.dialect || 'postgres',
      pool: {
        acquire: 30000,
        max: 5,
        min: 0,
        idle: 10000,
      },
      logging: !config.logging ? false : this.sqlLogger.bind(this),
      ...(typeof config.ssl !== 'undefined' && { ssl: config.ssl }),
      ...(typeof config.dialectOptions !== 'undefined' && {
        dialectOptions: config.dialectOptions,
      }),
    };

    this.nodeCache = new NodeCache();

    this.sequelize = new Sequelize(this.config.database, this.config.username, this.config.password, options);

    // If logging is enabled, create a separate instance of Sequelize with logging disabled for sensitive queries.
    // Warning: using muted sequelize may break SessionStore.
    let mutedSequelize;
    if (this.config.logging) {
      mutedSequelize = new Sequelize(this.config.database, this.config.username, this.config.password, {
        ...options,
        logging: false,
      });
    } else {
      mutedSequelize = this.sequelize;
    }

    this.models = {
      accessToken: new AccessTokenModel(mutedSequelize),
      authCode: new AuthCodeModel(mutedSequelize),
      client: new ClientModel(this.sequelize),
      clientUser: new ClientUserModel(this.sequelize),
      confirmCode: new ConfirmCodeModel(this.sequelize),
      loginHistory: new LoginHistoryModel(mutedSequelize),
      refreshToken: new RefreshTokenModel(mutedSequelize),
      sessions: new SessionsModel(mutedSequelize),
      userAdminAction: new UserAdminActionModel(mutedSequelize),
      user: new UserModel(this.sequelize),
      userOldData: new UserOldDataModel(this.sequelize),
      userServices: new UserServicesModel(this.sequelize),
      userTotpSecret: new UserTotpSecretModel(this.sequelize),
    };

    Models.singleton = this;
  }

  // Initialize all models.
  async init() {
    for (const model of Object.values(this.models) as BaseModel<any, any>[]) {
      await model.init();
    }
  }

  // A model getter.
  model<K extends keyof ModelsCollection>(model: K): ModelsCollection[K]['entity'] {
    if (!this.models[model]) {
      throw new Error(`Model ${model} not found`);
    }
    return this.models[model].entity;
  }

  static model<K extends keyof ModelsCollection>(model: K): ModelsCollection[K]['entity'] {
    if (!Models.singleton) {
      throw new Error(`Models are not initialized`);
    }
    if (!Models.singleton.models[model]) {
      throw new Error(`Model ${model} not found`);
    }
    return Models.singleton.models[model].entity;
  }

  // A Sequelize instance getter.
  get db(): Sequelize {
    return this.sequelize;
  }

  static get db(): Sequelize {
    if (!Models.singleton) {
      throw new Error(`Models are not initialized`);
    }
    return Models.singleton.sequelize;
  }

  static get cache(): NodeCache {
    if (!Models.singleton) {
      throw new Error(`Models are not initialized`);
    }
    return Models.singleton.nodeCache;
  }

  // A custom logger for SQL queries.
  sqlLogger(sql: any) {
    // Extract last record from the call stack (model name and method).
    const caller = new Error().stack?.split('\n').pop()?.split(/\s+/).slice(3, 4).join(' ');

    // Use global logger to save SQL queries.
    this.log.save('sql', { sql, caller });
  }
}

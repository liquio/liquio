import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface SessionsAttributes {
  sid: string;
  userId: string;
  expires: Date;
  data: string;
  // Whatever a strategy needs to terminate this specific session upstream
  // (e.g. OIDC's { id_token, end_session_endpoint }). Tied to the login
  // session itself, not the permanent user_services account link, so it
  // disappears with it. Generic on purpose so other strategies can reuse it.
  logout_data?: Record<string, any> | null;
}

export class SessionsModel extends BaseModel<SessionsAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'user_sessions',
      {
        sid: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        userId: DataTypes.STRING(24),
        expires: DataTypes.DATE,
        data: DataTypes.STRING(50000),
        logout_data: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
      },
      {
        timestamps: false,
        tableName: 'user_sessions',
      },
    );
  }
}

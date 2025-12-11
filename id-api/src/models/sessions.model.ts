import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface SessionsAttributes {
  sid: string;
  userId: string;
  expires: Date;
  data: string;
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
      },
      {
        timestamps: false,
        tableName: 'user_sessions',
      },
    );
  }
}

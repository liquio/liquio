import { AbstractDB } from './DB';

export class AuthorizeModel extends AbstractDB {
  authorize: any;

  constructor() {
    super();
    this.authorize = this.sequelize.define(
      'authorize',
      {
        authorize_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        login: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
        password: {
          type: this.DataTypes.TEXT,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'authorize',
      },
    );
  }

  get Authorize(): any {
    return this.authorize;
  }
}

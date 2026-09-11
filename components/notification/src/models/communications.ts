import { AbstractDB } from './DB';

export class CommunicationModel extends AbstractDB {
  communications: any;

  constructor() {
    super();
    this.communications = this.sequelize.define(
      'communications',
      {
        communication_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        enable: {
          type: this.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        timestamps: false,
        tableName: 'communications',
      },
    );
  }

  get Communications(): any {
    return this.communications;
  }
}

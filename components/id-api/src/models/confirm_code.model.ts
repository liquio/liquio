import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface ConfirmCodeAttributes {
  id: number;
  phone?: string;
  email?: string;
  code: string;
  counter: number;
  expiresIn: Date;
}

export type ConfirmCodeCreationAttributes = Omit<ConfirmCodeAttributes, 'id'>;

export class ConfirmCodeModel extends BaseModel<ConfirmCodeAttributes, ConfirmCodeCreationAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'confirmation_codes',
      {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        phone: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        email: {
          allowNull: true,
          type: DataTypes.STRING,
        },
        code: {
          allowNull: false,
          type: DataTypes.STRING(100),
        },
        counter: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        expiresIn: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'confirmation_codes',
      },
    );
  }
}

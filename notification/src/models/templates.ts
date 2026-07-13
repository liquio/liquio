import { AbstractDB } from './DB';

export class TemplatesModel extends AbstractDB {
  templates: any;

  constructor() {
    super();
    this.defineModel();
  }

  async defineModel(): Promise<void> {
    this.templates = this.sequelize.define(
      'templates',
      {
        template_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        type: {
          type: this.DataTypes.STRING,
          allowNull: false,
        },
        text: {
          type: this.DataTypes.TEXT,
          allowNull: false,
        },
        title: {
          type: this.DataTypes.TEXT,
          allowNull: false,
        },
      },
      {
        timestamps: false,
        tableName: 'templates',
      },
    );
  }

  get Templates(): any {
    return this.templates;
  }
}

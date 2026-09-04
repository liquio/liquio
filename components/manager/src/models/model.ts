import { Sequelize, ModelStatic, Model as SequelizeModel } from 'sequelize';

export class Model {
  db: Sequelize;
  model: ModelStatic<SequelizeModel>;

  constructor() {
    this.db = global.db;
  }
}

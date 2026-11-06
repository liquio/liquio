import { Sequelize, ModelStatic, Model as SequelizeModel } from 'sequelize';

import { getDb } from '../lib/context';

export class Model {
  db: Sequelize;
  model: ModelStatic<SequelizeModel>;

  constructor() {
    this.db = getDb();
  }
}

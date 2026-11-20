import { Sequelize, ModelStatic, Model as SequelizeModel } from 'sequelize';

import { getDb } from '../lib/context';

/**
 * Model.
 */
export class Model {
  db: Sequelize;
  config: any;
  model: ModelStatic<SequelizeModel>;

  /**
   * Model constructor.
   * @param {object} config Config.
   */
  constructor(config?: any) {
    this.db = getDb();
    this.config = config;
  }
}

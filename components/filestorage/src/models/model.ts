import { Sequelize, ModelStatic, Model as SequelizeModel } from 'sequelize';

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
    this.db = global.db;
    this.config = config;
  }
}

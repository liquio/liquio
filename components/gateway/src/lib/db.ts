import { Sequelize } from 'sequelize';

import { getLog } from './context';

export class Db {
  static singleton: Sequelize;

  constructor() {
    throw new Error('Constructor is private.');
  }

  /**
   * Get instance sequelize.
   * @returns {object} Sequelize instance.
   */
  static async getInstance(config: any): Promise<Sequelize> {
    if (!Db.singleton) {
      try {
        const sequelize = new Sequelize(config.database, config.username, config.password, config);

        await sequelize.authenticate();
        getLog().save('db-connection', 'Connection to DB has been established successfully.');

        Db.singleton = sequelize;
      } catch (error) {
        getLog().save('Unable to connect to the DB', error);
        throw error;
      }
    }

    return Db.singleton;
  }
}

import { Sequelize } from 'sequelize';

import { getLog } from './context';

/**
 * DB.
 */
export class Db {
  static singleton: Sequelize;

  /**
   * Constructor.
   */
  constructor() {
    throw new Error('Constructor is private.');
  }

  /**
   * Get instance sequelize.
   * @return {object} Sequelize instance.
   */
  static async getInstance(config: any) {
    if (!Db.singleton) {
      try {
        const { database, username, password } = config;
        const sequelize = new Sequelize(database, username, password, config);
        await sequelize.authenticate();
        getLog().save('db-connection-ok', { host: config.host, port: config.port });
        Db.singleton = sequelize;
      } catch (error) {
        getLog().save('db-connection-error', 'Unable to connect to the DB.', error);
        throw error;
      }
    }

    return Db.singleton;
  }
}

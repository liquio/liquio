import { Sequelize } from 'sequelize';

// Import local
import Log from './log';

/**
 * DB.
 */
export default class Db {
  private static singleton: Sequelize;
  private static log: Log;

  constructor() {
    throw new Error('Constructor is private.');
  }

  /**
   * Get instance sequelize.
   * @return {object} Sequelize instance.
   */
  static async getInstance(config): Promise<Sequelize> {
    if (!Db.singleton) {
      Db.log = Log.getInstance();
      try {
        const { database, username, password } = config;
        const sequelize = new Sequelize(database, username, password, config);
        await sequelize.authenticate();
        Db.log.save('db-connection-ok', { host: config.host, port: config.port });
        Db.singleton = sequelize;
      } catch (error) {
        Db.log.save('db-connection-error', 'Unable to connect to the DB.', error);
        throw error;
      }
    }

    return Db.singleton;
  }
}

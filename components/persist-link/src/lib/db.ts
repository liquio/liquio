// Import.
import Sequelize from 'sequelize';

import { getLog } from './context';

/**
 * DB.
 */
class Db {
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
  static async getInstance(config) {
    if (!Db.singleton) {
      try {
        const { database, username, password } = config;
        const sequelize = new Sequelize(database, username, password, config);
        await sequelize.authenticate();
        getLog().save('db-connection-error', 'Connection to DB has been established successfully.');
        Db.singleton = sequelize;
      } catch (error) {
        getLog().save('db-connection-error', 'Unable to connect to the DB.', error);
        throw error;
      }
    }

    return Db.singleton;
  }
}

// Export.
export default Db;

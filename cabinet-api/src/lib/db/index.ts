import { Sequelize, Options as SequelizeOptions } from 'sequelize';

/**
 * Database connection manager (singleton)
 */
class Db {
  private static singleton: Sequelize;

  /**
   * Constructor is private
   */
  private constructor() {
    throw new Error('Constructor is private.');
  }

  /**
   * Get or create Sequelize instance
   * @param config - Sequelize connection config
   * @returns Promise with Sequelize instance
   */
  static async getInstance(config: SequelizeOptions): Promise<Sequelize> {
    if (!Db.singleton) {
      try {
        const sequelize = new Sequelize(
          config.database as string,
          config.username as string,
          config.password as string,
          config
        );

        await sequelize.authenticate();
        log.save('db-connection', 'Connection to DB has been established successfully.');

        // Register lifecycle hooks using addHook
        sequelize.addHook('beforeConnect', () => {
          log.save('db-connection-opening');
        });

        sequelize.addHook('afterConnect', () => {
          log.save('db-connection-opened');
        });

        sequelize.addHook('beforeDisconnect', () => {
          log.save('db-connection-closing');
        });

        sequelize.addHook('afterDisconnect', () => {
          log.save('db-connection-closed');
        });

        Db.singleton = sequelize;
      } catch (error) {
        log.save('Unable to connect to the DB', error, 'error');
        throw error;
      }
    }

    return Db.singleton;
  }
}

export default Db;

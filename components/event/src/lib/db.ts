import { Sequelize } from 'sequelize';

export class Db {
  static singleton: any;

  /**
   * Constructor.
   */
  constructor() {
    throw new Error('Constructor is private.');
  }

  /**
   * Get instance sequelize.
   * @returns {object} Sequelize instance.
   */
  static async getInstance(config: any): Promise<any> {
    if (!Db.singleton) {
      try {
        const sequelize = new Sequelize(config.database, config.username, config.password, config);

        await sequelize.authenticate();
        global.log.save('db-connection', 'Connection to DB has been established successfully.');

        Db.singleton = sequelize;
      } catch (error: any) {
        global.log.save('Unable to connect to the DB', error);
        throw error;
      }
    }

    return Db.singleton;
  }
}

const Sequelize = require('sequelize');

class Db {
  constructor() {
    throw new Error('Constructor is private.');
  }

  /**
   * Get instance sequelize.
   * @returns {object} Sequelize instance.
   */
  static async getInstance(config) {
    if (!Db.singleton) {
      try {
        const sequelize = new Sequelize(
          config.database,
          config.username,
          config.password,
          config
        );

        await sequelize.authenticate();
        log.save('db-connection', 'Connection to DB has been established successfully.');

        Db.singleton = sequelize;
      } catch (error) {
        log.save('Unable to connect to the DB', error, 'error');
        throw error;
      }
    }

    return Db.singleton;
  }
}

module.exports = Db;

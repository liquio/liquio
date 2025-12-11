const Sequelize = require('sequelize');

class Db {
  constructor() {
    throw new Error('Constructor is private.');
  }

  /**
   * Get instance sequelize.
   * @returns {object} Sequelize instance.
   */
  static async getInstance(config, newInstance = false) {
    if (!Db.singleton || newInstance) {
      try {
        const sequelize = new Sequelize(config.database, config.username, config.password, config);

        await sequelize.authenticate();
        log.save('db-connection', 'Connection to DB has been established successfully.');

        sequelize.beforeConnect(() => {
          log.save('db-connection-opening');
        });

        sequelize.afterConnect(() => {
          log.save('db-connection-opened');
        });

        sequelize.beforeDisconnect(() => {
          log.save('db-connection-closing');
        });

        sequelize.afterDisconnect(() => {
          log.save('db-connection-closed');
        });

        Db.singleton = sequelize;
      } catch (error) {
        log.save('Unable to connect to the DB', error);
        throw error;
      }
    }

    return Db.singleton;
  }

  /**
   * Get timezone offset in +HH:MM format.
   * @returns {string} Timezone offset.
   */
  static get tz() {
    if (!Db.timezone) {
      const offset = -new Date().getTimezoneOffset();
      if (offset === 0) {
        Db.timezone = '+00:00';
      } else {
        const sign = offset >= 0 ? '+' : '-';
        const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
        Db.timezone = `${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
      }
    }
    return Db.timezone;
  }
}

module.exports = Db;

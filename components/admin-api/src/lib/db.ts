import { Sequelize } from 'sequelize';

import { getLog } from './context';

export class Db {
  private static singleton: Db;

  private static timezone: string;

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
        getLog().save('db-connection', 'Connection to DB has been established successfully.');

        Sequelize.beforeConnect(() => {
          getLog().save('db-connection-opening');
        });

        Sequelize.afterConnect(() => {
          getLog().save('db-connection-opened');
        });

        Sequelize.beforeDisconnect(() => {
          getLog().save('db-connection-closing');
        });

        Sequelize.afterDisconnect(() => {
          getLog().save('db-connection-closed');
        });

        Db.singleton = sequelize;
      } catch (error) {
        getLog().save('Unable to connect to the DB', error);
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

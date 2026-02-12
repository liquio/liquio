import Log from '../lib/log';
import { Sequelize } from 'sequelize';

declare global {
  var config: any;    // AppConfig — type later
  var log: Log;
  var db: Sequelize;
  var typeOf: (value: any) => string;
  var models: Record<string, any>;
}

export {};

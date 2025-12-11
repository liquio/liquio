import Multiconf from 'multiconf';

export const CONFIG_PATH = process.env.CONFIG_PATH || '../config/register';
export const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_REGISTER';

export const config: Config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);

export interface Config {
  access_log: { keyIds: string[] };
  admin: { swagger: boolean };
  afterhandler: {
    options: { reindexLimit: number };
    blockchain: any;
    elastic: any;
  };
  app: { processTitle: string };
  auth: {
    tokens: string[];
    allowRawSequelizeParamsUsers: string[];
    limitedAccess: Array<{ user: string; keys: string[] }>;
  };
  db: {
    database: string;
    host: string;
    port: number;
    dialect: string;
    username: string;
    password: string;
    operatorsAliases: boolean;
    dialectOptions: {
      socketPath: string;
      supportBigNumbers: boolean;
      bigNumberStrings: boolean;
    };
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
    logging: boolean;
    migrationStorageTableName: string;
  };
  encryption: {
    key: string;
    iv_size: number;
    batch_job_size: number;
  };
  filters: {
    wrongValues: string[];
  };
  key_signature: {
    [key: string]: { validationIdentity: string[] };
  };
  log: {
    console: any[];
    responsesData: boolean;
    excludeParams: string[];
  };
  pagination: {
    maxLimit: number;
    maxExportLimit: number;
    packetLimit: number;
  };
  redis: {
    isEnabled: boolean;
    host: string;
    port: number;
    defaultTtl: number;
  };
  search: {
    [key: string]: {
      resultsCount: number;
      doNotSearchThisWords: string[];
      replaceWords: Array<{ from: string; to: string }>;
    };
  };
  server: {
    hostname: string;
    port: number;
    maxBodySize: string;
    customer: string;
    environment: string;
  };
  sign: {
    timeout: number;
    url: string;
    token: string;
  };
}

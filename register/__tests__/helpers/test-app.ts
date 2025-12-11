import moment from 'moment';
import { execSync } from 'child_process';
import debug from 'debug';

import Log from '../../src/lib/log';
import ConsoleLogProvider from '../../src/lib/log/providers/console';
import Db from '../../src/lib/db';
import Afterhandler from '../../src/lib/afterhandler';
import ErrorWithDetails from '../../src/lib/errors';
import typeOf from '../../src/lib/typeOf';
import Models from '../../src/models';
import Router from '../../src/router';
import Encryption from '../../src/lib/encryption';
import { Config } from '../../src/lib/config';
import { RedisClient } from '../../src/lib/redis_client';

export const config: Config = {
  access_log: { keyIds: ['16', '505'] },
  admin: { swagger: true },
  app: { processTitle: 'bpmn-register' },
  auth: {
    tokens: ['Basic dGVzdDp0ZXN0'],
    allowRawSequelizeParamsUsers: [],
    limitedAccess: []
  },
  afterhandler: {
    options: { reindexLimit: 100 },
    blockchain: {
      isActive: false,
      handlingTimeout: 2000,
      waitingTimeout: 10000,
      keys: [],
      options: {
        providerName: 'hyperledger-fabric',
        providerParams: {
          apiUrl: 'http://openenvironment.liquio.local:3003',
          apiMethods: {
            getData: { requestType: 'GET', urlSuffix: '/api/documents/{id}' },
            createData: { requestType: 'POST', urlSuffix: '/api/documents' },
            updateData: { requestType: 'PUT', urlSuffix: '/api/documents' },
            deleteData: { requestType: 'POST', urlSuffix: '/api/documents/revoke' }
          },
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: '<removed>'
          }
        }
      }
    },
    elastic: {
      isActive: false,
      handlingTimeout: 2000,
      waitingTimeout: 10000,
      keys: [],
      options: {
        apiUrl: 'http://localhost:9200',
        apiMethods: {
          createOrUpdateData: { requestType: 'PUT', urlSuffix: '/register_key_{key-id}/_doc/{id}' },
          deleteData: { requestType: 'DELETE', urlSuffix: '/register_key_{key-id}/_doc/{id}' },
          dropIndex: { requestType: 'DELETE', urlSuffix: '/register_key_{key-id}' },
          createIndex: { requestType: 'PUT', urlSuffix: '/register_key_{key-id}' },
          getIndexCount: { requestType: 'GET', urlSuffix: '/register_key_{key-id}/_count' }
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Basic <removed>'
        }
      }
    }
  },
  key_signature: {},
  db: {
    database: 'register',
    host: 'postgres',
    port: 5432,
    dialect: 'postgres',
    username: 'postgres',
    password: '<REDACTED>',
    operatorsAliases: false,
    dialectOptions: {
      socketPath: '',
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false,
    migrationStorageTableName: 'sequelize_meta'
  },
  encryption: {
    key: 'pFtBuAmNreLJAb6U137WWDSK0wFi3KL1',
    iv_size: 12,
    batch_job_size: 100
  },
  log: {
    console: [],
    responsesData: false,
    excludeParams: ['token', 'authorization', 'Authorization']
  },
  redis: {
    isEnabled: false,
    host: '',
    port: 6379,
    defaultTtl: 30
  },
  sign: {
    timeout: 10000,
    url: 'http://sign',
    token: ''
  },
  filters: {
    wrongValues: ['@']
  },
  search: {
    main: {
      resultsCount: 10,
      doNotSearchThisWords: [],
      replaceWords: []
    }
  },
  server: {
    hostname: 'localhost',
    port: 3000,
    maxBodySize: '10mb',
    customer: 'test',
    environment: 'test'
  },
  pagination: {
    maxLimit: 100000,
    maxExportLimit: 1000000,
    packetLimit: 1000
  }
};

const consoleLogProvider = new ConsoleLogProvider('console', {
  excludeParams: config.log?.excludeParams
});

const log = new Log(process.env.ENABLE_CONSOLE_LOG ? [consoleLogProvider] : []);
(log as any).save = function (...args: unknown[]) {
  debug('test:log')(...(args as [any]));
};

// Globals.
global.config = config;
global.ErrorWithDetails = ErrorWithDetails;
global.typeOf = typeOf;

// Log unhandled rejections.
process.on('unhandledRejection', (error) => {
  const { stack, message } = error || ({} as any);
  log.save('unhandled-rejection', { stack, message }, 'error');
  process.exit(1);
});

// Set proxess title
process.title = config.app?.processTitle;

// Start async thread.
export async function startApp(config: Config) {
  // Save moment global to use in eval.
  global.moment = moment;

  // Init Redis.
  if (config.redis && config.redis.isEnabled) {
    new RedisClient({
      host: config.redis.host,
      port: config.redis.port
    });
  }

  // Init DB.
  global.db = await Db.getInstance(config.db);

  // Init models.
  const models = new Models(config);
  models.init();

  // Init afterhandler.
  const afterhandler = new Afterhandler(config.afterhandler, (models.models as any).afterhandler, (models.models as any).record);
  afterhandler.init();
  global.afterhandler = afterhandler;

  global.encryption = new Encryption(config.encryption);

  // Start server.
  const router = new Router(config);
  const express = await router.init();

  return { express, router, db: global.db };
}

export async function runMigrations(url) {
  execSync(`npx sequelize db:migrate --url ${url}`, { env: process.env });
}

export async function insertData(sequelize) {
  const REGISTERS = {
    90: {
      id: 90,
      name: 'CivReg',
      description: 'CivReg',
      parent_id: null,
      meta: '{"isTest":false,"updatedByPerson":{"userId":"62de9d293c9f772b75b78ec3","name":"Elara Veylin"}}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T09:00:44.385Z',
      updated_at: '2024-05-13T10:34:25.070Z'
    }
  };

  // Registers
  for (const registerId in REGISTERS) {
    const register = REGISTERS[registerId];
    await sequelize.query(
      {
        query: `INSERT INTO registers (id, "name", description, parent_id, meta, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          register.id,
          register.name,
          register.description,
          register.parent_id,
          register.meta,
          register.created_by,
          register.updated_by,
          register.created_at,
          register.updated_at
        ]
      },
      { raw: true }
    );
  }

  const KEYS = {
    149: {
      id: 149,
      register_id: 90,
      name: 'CivReg with numbers',
      description: 'CivReg with numbers',
      schema:
        '{"type":"object","properties":{"ebaby":{"description":"Connected to eMalyatko","type":"boolean","public":true},"OBJ_ID":{"type":"string","description":"OBJ_ID","public":true,"isRelationId":true},"NAME":{"type":"string","description":"NAME","public":true},"OBJ_STATUS":{"type":"number","description":"Status","public":true,"enum":[1,2]},"SHORTNAME":{"type":"string","description":"SHORTNAME","public":true},"atuId":{"type":"string","public":true,"description":"atuId","isRelationLink":true},"dratsAddress":{"description":"dratsAddress","type":"string","public":true},"edrpou":{"description":"edrpou","type":"string","public":true},"email":{"description":"email","type":"string","public":true},"phone":{"description":"phone","type":"string","public":true},"contactPerson":{"description":"contactPerson","type":"string","public":true},"hasDelivery":{"description":"hasDelivery","type":"number","public":true},"comment":{"description":"comment","type":"string","public":true},"case8":{"description":"case8","type":"boolean","public":true},"case13":{"description":"case13","type":"boolean","public":true},"case14":{"description":"case14","type":"boolean","public":true},"case15":{"description":"case15","type":"boolean","public":true},"case16":{"description":"case16","type":"boolean","public":true},"case18":{"description":"case18","type":"boolean","public":true},"case27":{"description":"case27","type":"boolean","public":true},"schedule":{"description":"Schedule","type":"string","public":true},"workingDays":{"description":"Working days","type":"string","public":true}},"required":["OBJ_STATUS"]}',
      parent_id: null,
      meta: '{"isTest":false,"updatedByPerson":{"userId":"62de9d293c9f772b75b78ec3","name":"Elara Veylin"}}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T09:00:44.453Z',
      updated_at: '2024-02-20T17:10:35.505Z',
      to_string: '(record) => { return record.data.NAME; };',
      to_search_string:
        "(record) => {\n    const casesIndicatorsMap = {\n        case8: '8',\n        case13: '13',\n        case14: '14',\n        case15: '15',\n        case16: '16',\n        case18: '18',\n        case27: '27'\n    };\n    const casesIndicators = '|' + Object.entries(casesIndicatorsMap).map(v => record.data[v[0]] ? v[1] : null).filter(v => !!v).join('|') + '|';\n    return [record.data.atuId, record.data.OBJ_ID, casesIndicators];\n};",
      to_export: '(record) => { return null; }',
      is_encrypted: false
    },
    151: {
      id: 151,
      register_id: 90,
      name: 'REF_EXTRACT_TYPES',
      description: 'CivReg extract types',
      schema:
        '{"type":"object","properties":{"RET_ID":{"type":"string","public":true},"NAME":{"type":"string","public":true},"RC_AR_TYPE":{"type":"string","public":true},"isFull":{"type":"boolean","public":true}},"required":[]}',
      parent_id: null,
      meta: '{"isTest":false}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T09:00:44.445Z',
      updated_at: '2022-01-24T09:36:12.113Z',
      to_string: '(record) => { return record.data.NAME; };',
      to_search_string: '(record) => { return [record.data.RET_ID]; };',
      to_export: '(record) => { return null; }',
      is_encrypted: false
    },
    163: {
      id: 163,
      register_id: 90,
      name: 'ATU_NAMES',
      description: 'ATU_NAMES',
      schema: '{"type":"object","properties":{"AN_ID":{"type":"string","public":true},"NAME":{"type":"string","public":true}},"required":[]}',
      parent_id: null,
      meta: '{"isTest":false}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T09:00:44.407Z',
      updated_at: '2022-01-24T09:24:57.711Z',
      to_string: '() => "";',
      to_search_string: '() => "";',
      to_export: '(record) => { return null; }',
      is_encrypted: false
    },
    164: {
      id: 164,
      register_id: 90,
      name: 'ATU',
      description: 'ATU',
      schema:
        '{"type":"object","properties":{"ATU_ID":{"type":"string","public":true},"AN_AN_ID":{"type":"string","public":true},"ATU_ATU_ID":{"type":"string","public":true},"ATU_LEVEL":{"type":"string","public":true},"ATU_OBJ_TYPE":{"type":"string","public":true},"ATU_OBJ_STATUS":{"type":"string","public":true},"ATU_CODE":{"type":"string","public":true}},"required":[]}',
      parent_id: null,
      meta: '{"isTest":false,"isPersonal":true,"updatedByPerson":{"userId":"61ea6b982aa5017982774156","name":"Test User"}}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T09:00:44.403Z',
      updated_at: '2023-08-17T07:33:40.952Z',
      to_string: '() => "";',
      to_search_string: '() => "";',
      to_export: '(record) => { return null; }',
      is_encrypted: false
    }
  };

  // Keys
  for (const keyId in KEYS) {
    const key = KEYS[keyId];
    await sequelize.query(
      {
        query: `INSERT INTO keys (id, register_id, "name", description, "schema", parent_id, meta, created_by, updated_by, created_at, updated_at, to_string, to_search_string, to_export, is_encrypted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          key.id,
          key.register_id,
          key.name,
          key.description,
          key.schema,
          key.parent_id,
          key.meta,
          key.created_by,
          key.updated_by,
          key.created_at,
          key.updated_at,
          key.to_string,
          key.to_search_string,
          key.to_export,
          key.is_encrypted
        ]
      },
      { raw: true }
    );
  }

  const RECORDS = {
    '88b68700-09b8-11ee-8bd8-f1f3dc4af6ad': {
      id: '88b68700-09b8-11ee-8bd8-f1f3dc4af6ad',
      register_id: 90,
      key_id: 149,
      data: '{"NAME": "Civil Registration Office — Sample", "atuId": "24", "email": "vcs@sk.cv.drsu.gov.ua", "phone": "(03739) 2-12-54", "OBJ_ID": "88490", "case13": true, "case14": true, "case15": true, "case16": true, "case18": true, "case27": true, "edrpou": "42679016", "ebaby": true, "schedule": "Tue-Fri 08:00-17:00, Sat 08:00-15:45, break 12:00-12:45", "SHORTNAME": "CivReg Office — Sample", "workingDays": "Tue, Wed, Thu, Fri, Sat", "dratsAddress": "2V Vasyla Stus St., Sampletown, 60200", "contactPerson": "Test User"}',
      meta: '{"user":"liquio-stage","person":{"id":"62de9d293c9f772b75b78ec3","name":"Elara Veylin"},"historyMeta":{"accessInfo":{"userId":"62de9d293c9f772b75b78ec3","userName":"Elara Veylin"}}}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2023-06-13T07:04:26.736Z',
      updated_at: '2024-02-01T13:18:15.873Z',
      allow_tokens: '{}',
      search_string: '24',
      search_string_2: '88490',
      search_string_3: '|13|14|15|16|18|27|',
      signature: null,
      is_encrypted: false
    },
    '87617e50-09b8-11ee-8bd8-f1f3dc4af6ad': {
      id: '87617e50-09b8-11ee-8bd8-f1f3dc4af6ad',
      register_id: 90,
      key_id: 149,
      data: '{"NAME": "Civil Registration Office — Sample", "atuId": "6", "email": "vcs@br.zt.drsu.gov.ua", "phone": "(04144)7-84-82", "OBJ_ID": "88554", "case13": true, "case14": true, "case15": true, "case16": true, "case18": true, "case27": true, "edrpou": "22061597", "ebaby": true, "schedule": "Tue-Fri 08:00-17:00, Sat 08:00-15:45, break 12:00-12:45", "SHORTNAME": "CivReg Office — Sample", "workingDays": "Tue, Wed, Thu, Fri, Sat", "dratsAddress": "16 Soborna St., Sampletown, 12701", "contactPerson": "Test User"}',
      meta: '{"user":"liquio-stage","historyMeta":{"accessInfo":{"userId":"62de9d293c9f772b75b78ec3","userName":"Elara Veylin"}},"person":{"id":"62de9d293c9f772b75b78ec3","name":"Elara Veylin"}}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2023-06-13T07:04:24.501Z',
      updated_at: '2024-02-01T13:18:15.204Z',
      allow_tokens: '{}',
      search_string: '6',
      search_string_2: '88554',
      search_string_3: '|13|14|15|16|18|27|',
      signature: null,
      is_encrypted: false
    },
    '8b3828d0-09b8-11ee-8bd8-f1f3dc4af6ad': {
      id: '8b3828d0-09b8-11ee-8bd8-f1f3dc4af6ad',
      register_id: 90,
      key_id: 149,
      data: '{"NAME": "Civil Registration Office — Sample", "atuId": "24", "case8": true, "email": "vcs@ht.cv.drsu.gov.ua", "phone": "(03731) 2-17-70", "OBJ_ID": "88519", "case13": true, "case14": true, "case15": true, "case16": true, "case18": true, "case27": true, "edrpou": "26593173", "ebaby": true, "schedule": "Tue-Fri 08:00-17:00, Sat 08:00-15:45, break 12:00-12:45", "SHORTNAME": "CivReg Office — Sample", "workingDays": "Tue, Wed, Thu, Fri, Sat", "dratsAddress": "60 Svato-Pokrovska St., Sampletown, 60000", "contactPerson": "Test User"}',
      meta: '{"user":"liquio-stage","person":{"id":"62de9d293c9f772b75b78ec3","name":"Elara Veylin"},"historyMeta":{"accessInfo":{"userId":"62de9d293c9f772b75b78ec3","userName":"Elara Veylin"}}}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2023-06-13T07:04:30.941Z',
      updated_at: '2024-02-01T13:18:15.927Z',
      allow_tokens: '{}',
      search_string: '24',
      search_string_2: '88519',
      search_string_3: '|8|13|14|15|16|18|27|',
      signature: null,
      is_encrypted: false
    },
    '8ade9720-09b8-11ee-8bd8-f1f3dc4af6ad': {
      id: '8ade9720-09b8-11ee-8bd8-f1f3dc4af6ad',
      register_id: 90,
      key_id: 149,
      data: '{"NAME": "Civil Registration Office — Sample", "atuId": "20", "case8": true, "email": "vcs_zh@khm.kh.drsu.gov.ua", "phone": "(068) 091-15-19", "OBJ_ID": "89783", "case13": true, "case14": true, "case15": true, "case16": true, "case18": true, "case27": true, "edrpou": "33292186", "ebaby": true, "schedule": "Tue-Fri 08:00-17:00, Sat 08:00-15:45, break 12:00-12:45", "SHORTNAME": "CivReg Office — Sample", "hasDelivery": 1, "workingDays": "Tue, Wed, Thu, Fri, Sat", "dratsAddress": "10/14 Malinovskoho St., Sampletown, 61052", "contactPerson": "Test User"}',
      meta: '{"user":"liquio-stage","person":{"id":"62de9d293c9f772b75b78ec3","name":"Elara Veylin"},"historyMeta":{"accessInfo":{"userId":"62de9d293c9f772b75b78ec3","userName":"Elara Veylin"}}}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2023-06-13T07:04:30.354Z',
      updated_at: '2024-02-01T13:18:16.285Z',
      allow_tokens: '{}',
      search_string: '20',
      search_string_2: '89783',
      search_string_3: '|8|13|14|15|16|18|27|',
      signature: null,
      is_encrypted: false
    },
    '8940ecb0-09b8-11ee-8bd8-f1f3dc4af6ad': {
      id: '8940ecb0-09b8-11ee-8bd8-f1f3dc4af6ad',
      register_id: 90,
      key_id: 149,
      data: '{"NAME": "Civil Registration Office — Sample", "atuId": "10", "email": "vcs.st.ko@kv.minjust.gov.ua", "phone": "(04564) 2-22-26", "OBJ_ID": "89028", "case13": true, "case14": true, "case15": true, "case16": true, "case18": true, "case27": true, "edrpou": "24213433", "ebaby": true, "schedule": "Tue-Fri 08:00-17:00, Sat 08:00-15:45, break 13:00-13:45", "SHORTNAME": "CivReg Office — Sample", "workingDays": "Tue, Wed, Thu, Fri, Sat", "dratsAddress": "3/2 Parkova St., Sampletown, 09401", "contactPerson": "Test User"}',
      meta: '{"user":"liquio-stage","person":{"id":"62de9d293c9f772b75b78ec3","name":"Elara Veylin"},"historyMeta":{"accessInfo":{"userId":"62de9d293c9f772b75b78ec3","userName":"Elara Veylin"}}}',
      created_by: 'liquio-stage',
      updated_by: 'liquio-stage',
      created_at: '2023-06-13T07:04:27.643Z',
      updated_at: '2024-02-01T13:18:15.576Z',
      allow_tokens: '{}',
      search_string: '10',
      search_string_2: '89028',
      search_string_3: '|13|14|15|16|18|27|',
      signature: null,
      is_encrypted: false
    },
    '3bdecae2-7d38-11ec-a6de-b57280148b1b': {
      id: '3bdecae2-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 163,
      data: '{"NAME": "No.2 Kyparysova", "AN_ID": "381047"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:08:21.766Z',
      updated_at: '2022-11-10T15:11:35.021Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '3bdecaf1-7d38-11ec-a6de-b57280148b1b': {
      id: '3bdecaf1-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 163,
      data: '{"NAME": "No.17 Vyshneva", "AN_ID": "381062"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:08:21.766Z',
      updated_at: '2022-11-10T15:11:35.085Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '3bdea3f8-7d38-11ec-a6de-b57280148b1b': {
      id: '3bdea3f8-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 163,
      data: '{"NAME": "Pavla Sagaidachnyi", "AN_ID": "381007"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:08:21.766Z',
      updated_at: '2022-11-10T15:11:34.825Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '3bdea3fd-7d38-11ec-a6de-b57280148b1b': {
      id: '3bdea3fd-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 163,
      data: '{"NAME": "\\"Berizka\\" Gardening Cooperative", "AN_ID": "381012"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:08:21.766Z',
      updated_at: '2022-11-10T15:11:34.837Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '3bdea402-7d38-11ec-a6de-b57280148b1b': {
      id: '3bdea402-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 163,
      data: '{"NAME": "Karyerna (Hirnytskyi district)", "AN_ID": "381017"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:08:21.766Z',
      updated_at: '2022-11-10T15:11:34.937Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '99afab63-7d38-11ec-a6de-b57280148b1b': {
      id: '99afab63-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 164,
      data: '{"ATU_ID": "747651", "CVK_AN": "3710", "AN_AN_ID": "3710", "ATU_CODE": "", "ATU_LEVEL": "5", "ATU_ATU_ID": "17078", "ATU_OBJ_TYPE": "1", "ATU_OBJ_STATUS": "1"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:10:59.162Z',
      updated_at: '2022-11-14T10:32:05.346Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '99afab68-7d38-11ec-a6de-b57280148b1b': {
      id: '99afab68-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 164,
      data: '{"ATU_ID": "747656", "CVK_AN": "31596", "AN_AN_ID": "31596", "ATU_CODE": "", "ATU_LEVEL": "5", "ATU_ATU_ID": "17078", "ATU_OBJ_TYPE": "1", "ATU_OBJ_STATUS": "1"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:10:59.162Z',
      updated_at: '2022-11-14T10:32:05.353Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '99afab6a-7d38-11ec-a6de-b57280148b1b': {
      id: '99afab6a-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 164,
      data: '{"ATU_ID": "747658", "CVK_AN": "32668", "AN_AN_ID": "32668", "ATU_CODE": "", "ATU_LEVEL": "5", "ATU_ATU_ID": "1845", "ATU_OBJ_TYPE": "1", "ATU_OBJ_STATUS": "1"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:10:59.162Z',
      updated_at: '2022-11-14T10:32:05.360Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '99afab6f-7d38-11ec-a6de-b57280148b1b': {
      id: '99afab6f-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 164,
      data: '{"ATU_ID": "747663", "CVK_AN": "32747", "AN_AN_ID": "32747", "ATU_CODE": "", "ATU_LEVEL": "5", "ATU_ATU_ID": "1845", "ATU_OBJ_TYPE": "1", "ATU_OBJ_STATUS": "1"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:10:59.162Z',
      updated_at: '2022-11-14T10:32:05.369Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '60d82005-7d38-11ec-a6de-b57280148b1b': {
      id: '60d82005-7d38-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 164,
      data: '{"ATU_ID": "197569", "CVK_AN": "32278", "AN_AN_ID": "32278", "ATU_CODE": "", "ATU_LEVEL": "5", "ATU_ATU_ID": "29974", "ATU_OBJ_TYPE": "1", "ATU_OBJ_STATUS": "1"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:09:23.797Z',
      updated_at: '2022-11-14T10:32:07.335Z',
      allow_tokens: '{}',
      search_string: '',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '44108792-7d37-11ec-a6de-b57280148b1b': {
      id: '44108792-7d37-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 151,
      data: '{"NAME": "Extract - Death", "RET_ID": "5", "RC_AR_TYPE": "5"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:01:26.025Z',
      updated_at: '2022-11-11T09:59:11.307Z',
      allow_tokens: '{}',
      search_string: '5',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '44108793-7d37-11ec-a6de-b57280148b1b': {
      id: '44108793-7d37-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 151,
      data: '{"NAME": "Extract - Marriage (premarital surname confirmation)", "RET_ID": "6", "RC_AR_TYPE": "7"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:01:26.025Z',
      updated_at: '2022-11-11T09:59:11.317Z',
      allow_tokens: '{}',
      search_string: '6',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '4410aea3-7d37-11ec-a6de-b57280148b1b': {
      id: '4410aea3-7d37-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 151,
      data: '{"NAME": "Extract - Change due to adoption", "RET_ID": "13", "RC_AR_TYPE": "3"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:01:26.025Z',
      updated_at: '2022-11-11T09:59:11.326Z',
      allow_tokens: '{}',
      search_string: '13',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '4410aea8-7d37-11ec-a6de-b57280148b1b': {
      id: '4410aea8-7d37-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 151,
      data: '{"NAME": "Extract - Marriage registration", "RET_ID": "7", "RC_AR_TYPE": "7"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:01:26.025Z',
      updated_at: '2022-11-11T09:59:11.334Z',
      allow_tokens: '{}',
      search_string: '7',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    },
    '44108794-7d37-11ec-a6de-b57280148b1b': {
      id: '44108794-7d37-11ec-a6de-b57280148b1b',
      register_id: 90,
      key_id: 151,
      data: '{"NAME": "Extract - Divorce", "RET_ID": "9", "RC_AR_TYPE": "6"}',
      meta: '{}',
      created_by: '"local"',
      updated_by: 'liquio-stage',
      created_at: '2022-01-24T15:01:26.025Z',
      updated_at: '2022-11-11T09:59:11.343Z',
      allow_tokens: '{}',
      search_string: '9',
      search_string_2: null,
      search_string_3: null,
      signature: null,
      is_encrypted: false
    }
  };

  // Records
  for (const recordId in RECORDS) {
    const record = RECORDS[recordId];
    await sequelize.query(
      {
        query: `INSERT INTO records (id, register_id, key_id, "data", meta, created_by, updated_by, created_at, updated_at, allow_tokens, search_string, search_string_2, search_string_3, signature, is_encrypted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          record.id,
          record.register_id,
          record.key_id,
          record.data,
          record.meta,
          record.created_by,
          record.updated_by,
          record.created_at,
          record.updated_at,
          record.allow_tokens,
          record.search_string,
          record.search_string_2,
          record.search_string_3,
          record.signature,
          record.is_encrypted
        ]
      },
      { raw: true }
    );
  }

  return {
    REGISTERS,
    KEYS,
    RECORDS
  };
}

test('testApp', async () => {
  expect(process.title).toBe(config.app?.processTitle);
});

module.exports = {
  config,
  startApp,
  runMigrations,
  insertData
};

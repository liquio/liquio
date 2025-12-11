import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import axios, { AxiosInstance } from 'axios';

import { config, startApp, runMigrations, insertData } from './helpers/test-app';

jest.setTimeout(30000);

describe('Record encryption', () => {
  let pgContainer: StartedPostgreSqlContainer;
  let client: AxiosInstance;
  let app;
  let db;
  let fixtures;

  beforeAll(async () => {
    try {
      pgContainer = await new PostgreSqlContainer('postgres:17').start();

      config.db.host = pgContainer.getHost();
      config.db.username = pgContainer.getUsername();
      config.db.database = pgContainer.getDatabase();
      config.db.password = pgContainer.getPassword();
      config.db.port = pgContainer.getMappedPort(5432);
      config.server.port = 30000;

      const appData = await startApp(config);
      app = (appData as any).app;
      db = appData.db;

      await runMigrations(pgContainer.getConnectionUri());
      fixtures = await insertData(db);

      client = axios.create({
        baseURL: `http://localhost:${config.server.port}`,
        timeout: 1000,
        headers: {
          token: 'Basic dGVzdDp0ZXN0'
        }
      });
    } catch (e) {
      console.error('Error in test setup', e);
      process.exit(1);
    }
  });

  afterAll(async () => {
    if (pgContainer) await pgContainer.stop();
    if (app?.server) await app.server.close();
    if (db) await db.close();
    if (global.afterhandler) {
      global.afterhandler.workers.forEach((worker) => worker.dispose());
    }
  });

  it('should successfully ping the application', async () => {
    const res = await client.get('/test/ping');

    expect(res.data.data.message).toBe('pong');
  });

  it('should list tested registers', async () => {
    const { data } = await client.get('/registers?offset=0&limit=5');

    expect(data.data[0].id).toBe(90);
    expect(data.meta.count).toBe(Object.keys(fixtures.REGISTERS).length);
  });

  it('should ensure that keys are not encrypted by default', async () => {
    const registerId = 90;

    const { data } = await client.get(`/keys?offset=0&limit=5&register_id=${registerId}`);

    // Make sure that all keys are unencrypted initially
    data.data.map((key) => {
      expect(key.isEncrypted).toBe(false);
    });

    expect(data.meta.count).toBe(Object.keys(fixtures.KEYS).length);
  });

  it('should ensure that records are not encrypted by default', async () => {
    const keyId = 151;

    const { data } = await client.get(`/records?offset=0&limit=100&key_id=${keyId}`);

    // Make sure that all records are unencrypted initially
    data.data.map((record) => {
      expect(record.isEncrypted).toBe(false);
    });

    expect(data.meta.count).toBe(5);
  });

  it('should create a new unencrypted record in an unencrypted key', async () => {
    const registerId = 90;
    const keyId = 151;

    {
      const data = {
        NAME: 'Витяг про шифрування',
        RET_ID: '420',
        RC_AR_TYPE: '69'
      };
      const res = await client.post('/records', {
        registerId,
        keyId,
        data
      });

      expect(res.data.data.isEncrypted).toBe(false);
    }
  });

  it('should search records within an unencrypted key', async () => {
    const keyId = 151;
    const res = await client.get(`/records/search?offset=0&limit=100&key_id=${keyId}&text=Витяг`);
    expect(res.status).toBe(200);
  });

  it('should not be able to encrypt a key that already has records', async () => {
    const keyId = 151;

    try {
      const res = await client.put(`/keys/${keyId}`, {
        id: keyId,
        registerId: 90,
        name: 'Витяг про шифрування',
        description: 'Витяг про шифрування',
        isEncrypted: true
      });

      expect(res).not.toBeDefined();
    } catch (e) {
      expect(e.response.status).toBe(400);
    }
  });

  it('should encrypt records if triggered manually', async () => {
    const keyId = 151;

    {
      const { data } = await client.get(`/keys/${keyId}`);
      expect(data.data.isEncrypted).toBe(false);
    }

    // Change key to encrypted manually through the SQL update
    await db.query(`UPDATE keys SET is_encrypted = true WHERE id = ${keyId}`);

    // Trigger manual encryption of records
    {
      const { data } = await client.post(`/keys/${keyId}/process-encryption`);
      expect(data.data.count).toBe(6);
    }

    // Now records are encrypted
    {
      const [rawRecords] = await db.query('SELECT * FROM records WHERE key_id = :keyId', { replacements: { keyId }, raw: true });
      for (const recordRaw of rawRecords) {
        // Make sure that records are encrypted
        expect(recordRaw.is_encrypted).toBe(true);

        // But transparently decrypted on request
        expect(recordRaw.data).toHaveProperty('$encrypted');
      }
    }
  });

  it('should ensure that records are encrypted when key is switched to encrypted', async () => {
    const keyId = 151;

    {
      const { data } = await client.get(`/records?offset=0&limit=100&key_id=${keyId}`);

      data.data.map((record) => {
        // Make sure that records are encrypted
        expect(record.isEncrypted).toBe(true);

        // But transparently decrypted on request
        expect(record.data).toHaveProperty('NAME');
      });

      expect(data.meta.count).toBe(6);
    }
  });

  it('should create a new encrypted record in an encrypted key', async () => {
    const registerId = 90;
    const keyId = 151;

    // Create new record
    let recordId;
    {
      const data = {
        NAME: 'Витяг про розшифрування',
        RET_ID: '421',
        RC_AR_TYPE: '70'
      };
      const res = await client.post('/records', {
        registerId,
        keyId,
        data
      });

      expect(res.data.data.isEncrypted).toBe(true);
      expect(res.data.data.data).toHaveProperty('NAME');

      recordId = res.data.data.id;
    }

    {
      // Make sure that the new record is encrypted
      const res = await client.get(`/records/${recordId}`);
      expect(res.data.data.isEncrypted).toBe(true);

      // But the output is transparently encrypted on request
      expect(res.data.data.data).toHaveProperty('NAME');
    }
  });

  it('should transparently export records from an encrypted key', async () => {
    const keyId = 151;

    const {
      data: { data: prepareData }
    } = await client.post(`/export/start-preparing`, {
      keyId
    });

    expect(prepareData).toHaveProperty('keyId', keyId);
    expect(prepareData).toHaveProperty('exportId');

    const exportId = prepareData.exportId;

    let timeout = 5000; // Timeout in milliseconds
    let interval = 50; // Interval in milliseconds

    while (true) {
      const {
        data: {
          data: { status }
        }
      } = await client.get(`/export/${exportId}/status`);
      if (status === 'Prepared') {
        break;
      }

      timeout -= interval;
      if (timeout <= 0) {
        throw new Error('Export preparation timed out');
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    const { data } = await client.get(`/export/${exportId}/data`);

    expect(data).toHaveProperty('key.id', keyId);
    expect(data).toHaveProperty('key.isEncrypted', true);
    expect(data).toHaveProperty('register.id', 90);
    expect(data).toHaveProperty('options.onlySchema', false);
    expect(data).toHaveProperty('records');
    expect(data.records.length).toBe(7);
    for (const record of data.records) {
      expect(record).not.toHaveProperty('isEncrypted');
    }
  });

  it('should reencrypt record data on update', async () => {
    const registerId = 90;
    const keyId = 151;
    const recordId = '44108792-7d37-11ec-a6de-b57280148b1b';

    const data = { NAME: 'Витяг про смерть', RET_ID: '5', RC_AR_TYPE: '777' };

    {
      const res = await client.put(`/records/${recordId}`, {
        registerId,
        keyId,
        data
      });

      expect(res.data.data.isEncrypted).toBe(true);
      expect(res.data.data.data.RC_AR_TYPE).toBe('777');
    }

    // Make sure that the updated record is encrypted in the database
    {
      const [rawRecord] = await db.query('SELECT * FROM records WHERE id = :recordId', { replacements: { recordId }, raw: true });
      expect(rawRecord[0].is_encrypted).toBe(true);
      expect(rawRecord[0].data).toHaveProperty('$encrypted');
    }
  });

  it('should fail record search within an encrypted key', async () => {
    const keyId = 151;

    try {
      const res = await client.get(`/records/search?offset=0&limit=100&key_id=${keyId}&text=Витяг`);
      expect(res).not.toBeDefined();
    } catch (e) {
      expect(e.response.status).toBe(400);
    }
  });

  it('should not be able to decrypt a key that already has records', async () => {
    const keyId = 151;

    try {
      const res = await client.put(`/keys/${keyId}`, {
        id: keyId,
        name: 'Витяг про шифрування',
        description: 'Витяг про шифрування',
        isEncrypted: false
      });

      expect(res).not.toBeDefined();
    } catch (e) {
      expect(e.response.status).toBe(400);
    }
  });

  it('should decrypt the key records if triggered manually', async () => {
    const keyId = 151;

    // Change key to encrypted manually through the SQL update
    await db.query(`UPDATE keys SET is_encrypted = false WHERE id = ${keyId}`);

    // Trigger manual encryption of records
    {
      const { data } = await client.post(`/keys/${keyId}/process-encryption`);
      expect(data.data.count).toBe(7);
    }

    // Check that records are decrypted in the database
    {
      const [rawRecords] = await db.query('SELECT * FROM records WHERE key_id = :keyId', { replacements: { keyId }, raw: true });
      for (const recordRaw of rawRecords) {
        // Make sure that records are encrypted
        expect(recordRaw.is_encrypted).toBe(false);

        // But transparently decrypted on request
        expect(recordRaw.data).not.toHaveProperty('$encrypted');
      }
    }

    // Make sure that transparent decryption doesn't break normal output
    {
      const { data } = await client.get(`/records?offset=0&limit=100&key_id=${keyId}`);

      data.data.map((record) => {
        // Make sure that records are encrypted
        expect(record.isEncrypted).toBe(false);

        // But transparently encrypted on request
        expect(record.data).toHaveProperty('NAME');
      });

      expect(data.meta.count).toBe(7);
    }
  });

  it('should be able to create a new key with encryption disabled', async () => {
    const registerId = 90;

    const res = await client.post('/keys', {
      registerId,
      name: 'Витяг про шифрування',
      description: 'Витяг про шифрування',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Опис поля',
            public: true
          }
        },
        required: []
      },
      toString: '() => "";',
      toSearchString: '() => "";'
    });

    expect(res.data.data.isEncrypted).toBe(false);
    expect(res.data.data.id).toBe(1);
  });

  it('should allow to encrypt a key without records', async () => {
    const keyId = 1;

    const res = await client.put(`/keys/${keyId}`, {
      id: keyId,
      name: 'Витяг про шифрування',
      description: 'Витяг про шифрування',
      isEncrypted: true
    });

    expect(res.data.data.isEncrypted).toBe(true);
  });
});

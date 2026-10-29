import http from 'node:http';
import { AddressInfo } from 'node:net';

import { TestHarness } from './test-harness';
import AfterhandlerWorker from '../src/lib/afterhandler/workers/worker';
import ElasticAfterhandlerWorker from '../src/lib/afterhandler/workers/elastic';
import PLinkAfterhandlerWorker from '../src/lib/afterhandler/workers/plink';
import HyperledgerFabricBlockchainProvider from '../src/lib/afterhandler/workers/blockchain/providers/hyperledger_fabric';
import { PgPubSub } from '../src/lib/pgpubsub';
import {
  assertEncryptionConfig,
  assertSafeConfig,
  checkAuthConfig,
  checkEncryptionConfig,
  warnEmptySignToken,
  warnPlainHttpSign,
} from '../src/lib/config_guard';
import { authorizeRequest, checkServicePermissionsConfig, listUnrestrictedUsers } from '../src/lib/service_permissions';

type Seen = { method: string; url: string; body: string; headers: http.IncomingHttpHeaders };

describe('Afterhandler, config guard, permissions, pgpubsub (GITHUB-887 T08 C)', () => {
  let h: TestHarness;
  const auth = 'Basic dGVzdDp0ZXN0LXBhc3MtMTIzNA==';
  const api = () => h.request();
  const post = (url: string, body: object = {}) => api().post(url).set('Authorization', auth).send(body);
  let registerId: number;
  let keyId: number;
  let recordId: string;
  let model: any;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Local fake HTTP endpoint (nock is not a dependency of this component).
  let server: http.Server;
  let base: string;
  let seen: Seen[] = [];
  let respond: (req: Seen) => { status: number; body: any } = () => ({ status: 200, body: {} });
  const setRespond = (fn: typeof respond) => (respond = fn);

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const s = { method: req.method, url: req.url, body, headers: req.headers };
        seen.push(s);
        const r = respond(s);
        res.writeHead(r.status, { 'Content-Type': 'application/json' });
        res.end(typeof r.body === 'string' ? r.body : JSON.stringify(r.body));
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    h = new TestHarness();
    await h.setup({ useDatabase: true, useRedis: true });
    await h.setupFixtures();
    const reg = await post('/registers', { name: 'C reg', description: 'c' }).expect(200);
    registerId = reg.body.data.id;
    const key = await post('/keys', {
      registerId,
      name: 'ck',
      description: 'c',
      schema: {
        type: 'object',
        properties: {
          f: { type: 'string', typeElastic: 'text' },
          n: { type: 'number', typeElastic: 'long' },
          o: { type: 'object', properties: { x: { type: 'string', typeElastic: 'keyword' } } },
          a: { type: 'array', items: { properties: { y: { type: 'string', typeElastic: 'keyword' } } } },
        },
      },
      toString: '(record) => record.data.f',
      toSearchString: '(record) => record.data.f',
      toExport: '(record) => null',
      meta: { afterhandlers: ['elastic', 'plink'] },
    }).expect(200);
    keyId = key.body.data.id;
    const rec = await post('/records', { registerId, keyId, data: { f: 'alpha', n: 1 } }).expect(200);
    recordId = rec.body.data.id;
    model = (global as any).afterhandler.afterhandlerModel;
  }, 60000);

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await h.teardown();
  });

  describe('AfterhandlerModel', () => {
    let rows: any[];
    it('creates afterhandler rows through history for the key meta', async () => {
      const { data } = await model.getAllNotSyncedByKeyId(keyId).catch(() => ({ data: [] }));
      const [last] = [await model.getLastByKeyId(keyId)];
      expect(last).toBeTruthy();
      rows = data;
      expect(['elastic', 'plink']).toContain(last.type);
    });

    it('findFirstNotSynced returns oldest unsynced row of a type with history', async () => {
      const { data } = await model.findFirstNotSynced('elastic');
      expect(data.type).toBe('elastic');
      expect(data.synced).toBe(false);
      expect(data.history.recordId).toBe(recordId);
    });

    it('findFirstNotSynced yields undefined data for a type with nothing pending', async () => {
      const { data } = await model.findFirstNotSynced('blockchain');
      expect(data).toBeFalsy();
    });

    it('findById, setSynced, setSyncedWithError and clearError update the row', async () => {
      const { data: first } = await model.findFirstNotSynced('plink');
      const byId = await model.findById(first.id);
      expect(byId.data.id).toBe(first.id);
      const errored = await model.setSyncedWithError(first.id, 'boom');
      expect(errored.data.synced).toBe(true);
      expect(errored.data.hasError).toBe(true);
      expect(errored.data.errorMessage).toBe('boom');
      expect(errored.meta.updatedRowsCount).toBe(1);
      const cleared = await model.clearError(first.id);
      expect(cleared.data.hasError).toBe(false);
      expect(cleared.data.errorMessage).toBeNull();
      const synced = await model.setSynced(first.id);
      expect(synced.data.synced).toBe(true);
    });

    it('create inserts a new unsynced row', async () => {
      const { data: hist } = await model.findFirstNotSynced('elastic');
      const { data } = await model.create({ type: 'blockchain', historyId: hist.historyId, user: 'tester' });
      expect(data.type).toBe('blockchain');
      expect(data.synced).toBe(false);
      expect(data.createdBy).toBe('tester');
      const { data: pending } = await model.findFirstNotSynced('blockchain');
      expect(pending.id).toBe(data.id);
      await model.setSynced(data.id);
    });

    it('setSyncedWithErrorByKeyid marks unsynced rows of the key as errored', async () => {
      const count = await model.setSyncedWithErrorByKeyid(keyId, 'Reindex started.');
      expect(count).toBeGreaterThanOrEqual(1);
      const { data } = await model.findFirstNotSynced('elastic');
      expect(data).toBeFalsy();
      const errored = await model.model.count({ where: { has_error: true, error_message: 'Reindex started.' } });
      expect(errored).toBe(count);
      expect(rows).toBeDefined();
    });
  });

  describe('AfterhandlerWorker base', () => {
    const cfg = { isActive: true, handlingTimeout: 5, waitingTimeout: 5 };

    it('abstract methods throw', async () => {
      const w = new AfterhandlerWorker('elastic', cfg, model);
      await expect(w.handle({})).rejects.toThrow('Abstract method should be redefined in child classes.');
      await expect(w.reindexReset(1, {})).rejects.toThrow('Abstract method');
      await expect(w.reindexAdd({})).rejects.toThrow('Abstract method');
      await expect(w.validateRecord({}, 'create')).resolves.toBeUndefined();
    });

    it('start returns immediately when not active', async () => {
      const w = new AfterhandlerWorker('elastic', { ...cfg, isActive: false }, model);
      await w.start();
      expect(w.started).toBe(false);
    });

    it('start loop handles a row, marks it synced and stops on stop()', async () => {
      const row = await model.create({
        type: 'elastic',
        historyId: (await model.findById((await model.getLastByKeyId(keyId)).id)).data.historyId,
        user: 'w',
      });
      const w = new AfterhandlerWorker('elastic', cfg, model);
      const handled: string[] = [];
      w.handle = async (history) => {
        handled.push(history.recordId);
        await w.stop();
        return true;
      };
      await w.start();
      expect(handled).toEqual([recordId]);
      expect((await model.findById(row.data.id)).data.synced).toBe(true);
      expect(w.started).toBe(false);
    });

    it('start loop records handler errors on the row', async () => {
      const row = await model.create({
        type: 'elastic',
        historyId: (await model.findById((await model.getLastByKeyId(keyId)).id)).data.historyId,
        user: 'w',
      });
      const w = new AfterhandlerWorker('elastic', cfg, model);
      w.handle = async () => {
        await w.stop();
        throw new Error('handler failed');
      };
      await w.start();
      const after = (await model.findById(row.data.id)).data;
      expect(after.synced).toBe(true);
      expect(after.hasError).toBe(true);
      expect(after.errorMessage).toBe('handler failed');
    });

    it('start loop survives a failing setSyncedWithError and idles when nothing pending', async () => {
      const w = new AfterhandlerWorker('elastic', cfg, model);
      let calls = 0;
      w.findFirstNotSynced = async () => {
        calls += 1;
        if (calls === 1) return { id: 'x', history: { recordId: 'r' } } as any;
        await w.stop();
        return undefined;
      };
      w.handle = async () => {
        throw new Error('nope');
      };
      w.setSyncedWithError = async () => {
        throw new Error('db down');
      };
      await w.start();
      expect(calls).toBe(2);
    });

    it('dispose clears references once and returns 0 without gc', () => {
      const w = new AfterhandlerWorker('elastic', cfg, model);
      const g = (global as any).gc;
      (global as any).gc = undefined;
      try {
        expect(w.dispose()).toBe(0);
        expect(w.disposed).toBe(true);
        expect(w.config).toBeNull();
        expect(w.afterhandlerModel).toBeNull();
        expect(w.dispose()).toBeUndefined();
      } finally {
        (global as any).gc = g;
      }
    });

    it('findFirstNotSynced/setSynced delegate to the model', async () => {
      const w = new AfterhandlerWorker('blockchain', cfg, model);
      expect(await w.findFirstNotSynced()).toBeFalsy();
      const { data } = await model.create({
        type: 'blockchain',
        historyId: (await model.findById((await model.getLastByKeyId(keyId)).id)).data.historyId,
        user: 'w',
      });
      await w.setSynced(data.id);
      expect((await model.findById(data.id)).data.synced).toBe(true);
    });
  });

  describe('Elastic worker', () => {
    const history = (operation: string, extra: object = {}) => ({
      recordId: 'r1',
      operation,
      keyId,
      data: { keyId, data: { f: 'v' } },
      toJSON: () => ({ id: 'h' }),
      ...extra,
    });
    const make = (extra: object = {}) =>
      new ElasticAfterhandlerWorker({ isActive: true, options: { apiUrl: base, headers: { 'X-T': 't' }, ...extra }, waitingTimeout: 2000 }, model);

    beforeEach(() => {
      seen = [];
      setRespond(() => ({ status: 200, body: {} }));
    });

    it('uses defaults and exposes the type', () => {
      const w = new ElasticAfterhandlerWorker({ isActive: false }, model);
      expect(w.apiUrl).toBe('http://localhost:9200');
      expect(w.timeout).toBe(20000);
      expect(ElasticAfterhandlerWorker.afterhandlerType).toBe('elastic');
      expect(w.getElasticDataId('record', 5)).toBe('record-5');
    });

    it('handle create/update PUTs the document and is handled on created/updated', async () => {
      const w = make();
      setRespond(() => ({ status: 200, body: { result: 'created' } }));
      expect(await w.handle(history('create'))).toBe(true);
      setRespond(() => ({ status: 200, body: { result: 'updated' } }));
      expect(await w.handle(history('update'))).toBe(true);
      expect(seen[0].method).toBe('PUT');
      expect(seen[0].url).toBe(`/register_key_${keyId}/_doc/record-r1`);
      expect(JSON.parse(seen[0].body)).toEqual({ keyId, data: { f: 'v' } });
      expect(seen[0].headers['x-t']).toBe('t');
    });

    it('handle is not handled on an unknown result', async () => {
      setRespond(() => ({ status: 200, body: { result: 'noop' } }));
      expect(await make().handle(history('create'))).toBe(false);
    });

    it('handle resolves key id from key_id when keyId absent', async () => {
      setRespond(() => ({ status: 200, body: { result: 'created' } }));
      await make().handle({ ...history('create'), keyId: undefined, data: { key_id: 77 } });
      expect(seen[0].url).toBe('/register_key_77/_doc/record-r1');
    });

    it('handle delete handles deleted and 404 not_found, rejects bad operation', async () => {
      const w = make();
      setRespond(() => ({ status: 200, body: { result: 'deleted' } }));
      expect(await w.handle(history('delete'))).toBe(true);
      expect(seen[0].method).toBe('DELETE');
      setRespond(() => ({ status: 404, body: { result: 'not_found' } }));
      expect(await w.handle(history('delete'))).toBe(true);
      expect(await w.deleteData(keyId, 'record', 'r1')).toBe('not_found');
      await expect(w.handle(history('merge'))).rejects.toThrow('Wrong operation type.');
    });

    it('deleteData swallows other errors', async () => {
      setRespond(() => ({ status: 500, body: {} }));
      expect(await make().deleteData(keyId, 'record', 'r1')).toBeUndefined();
    });

    it('createOrUpdateData throws the elastic error reason', async () => {
      setRespond(() => ({ status: 200, body: { error: { reason: 'mapping conflict' } } }));
      await expect(make().createOrUpdateData(keyId, 'record', 'r1', {})).rejects.toThrow('mapping conflict');
      setRespond(() => ({ status: 200, body: { error: {} } }));
      await expect(make().createOrUpdateData(keyId, 'record', 'r1', {})).rejects.toThrow('Elastic request error.');
      setRespond(() => ({ status: 500, body: {} }));
      await expect(make().createOrUpdateData(keyId, 'record', 'r1', {})).rejects.toThrow('Request failed with status code 500');
    });

    it('getIndexCount returns data and guards inactive/undefined config', async () => {
      setRespond(() => ({ status: 200, body: { count: 3 } }));
      expect(await make().getIndexCount(keyId)).toEqual({ count: 3 });
      expect(seen[0].url).toBe(`/register_key_${keyId}/_count`);
      setRespond(() => ({ status: 500, body: {} }));
      expect(await make().getIndexCount(keyId)).toBeUndefined();
      const inactive = new ElasticAfterhandlerWorker({ isActive: false }, model);
      await expect(inactive.getIndexCount(1)).rejects.toThrow('Elastic afterhandler is not active.');
      const undef = make();
      undef.apiMethods = { ...undef.apiMethods, getIndexCount: undefined };
      await expect(undef.getIndexCount(1)).rejects.toThrow('Elastic afterhandler is not defined.');
    });

    it('dropIndex returns acknowledged/result/error and tolerates failure', async () => {
      const w = make();
      setRespond(() => ({ status: 200, body: { acknowledged: true } }));
      expect(await w.dropIndex(keyId)).toBe(true);
      setRespond(() => ({ status: 500, body: {} }));
      expect(await w.dropIndex(keyId)).toBeUndefined();
    });

    it('schemaToElasticMappings maps typeElastic for nested object/array fields', async () => {
      const m = await make().schemaToElasticMappings(keyId);
      expect(m).toEqual({
        properties: {
          data: {
            properties: {
              f: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              n: { type: 'long' },
              o: { properties: { x: { type: 'keyword' } } },
              a: { properties: { y: { type: 'keyword' } } },
            },
          },
        },
      });
    });

    it('schemaToElasticMappings returns {} for an unknown key', async () => {
      const w = make();
      w.keyModel = { findById: async () => null } as any;
      expect(await w.schemaToElasticMappings(1)).toEqual({});
    });

    it('createIndex PUTs mappings with options and returns the result', async () => {
      setRespond(() => ({ status: 200, body: { result: 'created' } }));
      expect(await make().createIndex(keyId, { settings: { number_of_shards: 1 } })).toBe('created');
      const body = JSON.parse(seen[0].body);
      expect(body.settings).toEqual({ number_of_shards: 1 });
      expect(body.mappings.properties.data.properties.n).toEqual({ type: 'long' });
      setRespond(() => ({ status: 500, body: {} }));
      expect(await make().createIndex(keyId)).toBeUndefined();
    });

    it('reindexReset drops then creates index; no-op when inactive', async () => {
      setRespond(() => ({ status: 200, body: { acknowledged: true, result: 'created' } }));
      expect(await make().reindexReset(keyId, {})).toBe(true);
      expect(seen.map((s) => s.method)).toEqual(['DELETE', 'PUT']);
      seen = [];
      const inactive = new ElasticAfterhandlerWorker({ isActive: false }, model);
      expect(await inactive.reindexReset(keyId, {})).toBe(true);
      expect(await inactive.reindexAdd({})).toBe(true);
      expect(seen).toHaveLength(0);
    });

    it('reindexAdd indexes a record using keyId or key_id', async () => {
      setRespond(() => ({ status: 200, body: { result: 'created' } }));
      expect(await make().reindexAdd({ id: 'r9', keyId: 4 })).toBe(true);
      expect(seen[0].url).toBe('/register_key_4/_doc/record-r9');
      setRespond(() => ({ status: 200, body: { result: 'noop' } }));
      expect(await make().reindexAdd({ id: 'r9', key_id: 5 })).toBe(false);
    });
  });

  describe('PLink worker', () => {
    const cfg = () => ({ isActive: true, url: base, token: 'tok', keys: [keyId], waitingTimeout: 2000 });
    const dl = { data: { deepLink: { method: 'm1', hash: 'h1' } } };
    beforeEach(() => {
      seen = [];
      setRespond(() => ({ status: 200, body: { ok: 1 } }));
    });

    it('create posts the deep link request and is true on body data', async () => {
      const w = new PLinkAfterhandlerWorker(cfg(), model);
      expect(PLinkAfterhandlerWorker.afterhandlerType).toBe('plink');
      expect(await w.create(keyId, 'record', 'r1', dl)).toBe(true);
      expect(seen[0].method).toBe('POST');
      expect(seen[0].url).toBe('/link');
      expect(seen[0].headers.token).toBe('tok');
      expect(JSON.parse(seen[0].body)).toEqual({
        type: 'external',
        options: { templateName: 'register', templateMethod: 'm1', filter: { recordId: 'r1' } },
        small: true,
        definedHash: 'h1',
      });
    });

    it('create returns false for empty body, missing method/hash and server errors', async () => {
      const w = new PLinkAfterhandlerWorker(cfg(), model);
      setRespond(() => ({ status: 200, body: '' }));
      expect(await w.create(keyId, 'record', 'r1', dl)).toBe(false);
      expect(await w.create(keyId, 'record', 'r1', { data: {} })).toBe(false);
      setRespond(() => ({ status: 500, body: {} }));
      expect(await w.create(keyId, 'record', 'r1', dl)).toBe(false);
    });

    it('create throws the server message on 400', async () => {
      const w = new PLinkAfterhandlerWorker(cfg(), model);
      setRespond(() => ({ status: 400, body: { error: { message: 'bad hash' } } }));
      await expect(w.create(keyId, 'record', 'r1', dl)).rejects.toThrow('bad hash');
      setRespond(() => ({ status: 400, body: {} }));
      await expect(w.create(keyId, 'record', 'r1', dl)).rejects.toThrow('Bad Request');
    });

    it('create uses an https agent when tls is configured', async () => {
      const w = new PLinkAfterhandlerWorker({ ...cfg(), tls: { rejectUnauthorized: true } }, model);
      expect(await w.create(keyId, 'record', 'r1', dl)).toBe(true);
    });

    it('handle supports create and rejects other operations', async () => {
      const w = new PLinkAfterhandlerWorker(cfg(), model);
      const hist = (operation: string) => ({ recordId: 'r1', operation, data: { ...dl, keyId }, toJSON: () => ({}) }) as any;
      expect(await w.handle(hist('create'))).toBe(true);
      await expect(w.handle(hist('delete'))).rejects.toThrow('Wrong operation type.');
    });

    it('reindex methods are no-ops', async () => {
      const w = new PLinkAfterhandlerWorker(cfg(), model);
      expect(await w.reindexReset(1, {})).toBe(true);
      expect(await w.reindexAdd({})).toBe(true);
      const off = new PLinkAfterhandlerWorker({ ...cfg(), isActive: false }, model);
      expect(await off.reindexReset(1, {})).toBe(true);
      expect(await off.reindexAdd({})).toBe(true);
    });

    it('validateRecord enforces deepLink only for active configured keys', async () => {
      const w = new PLinkAfterhandlerWorker(cfg(), model);
      await expect(w.validateRecord({ data: {}, key_id: keyId })).rejects.toThrow('Validation error: deepLink.method is not defined.');
      await expect(w.validateRecord({ data: { deepLink: { method: 'm' } }, key_id: keyId })).rejects.toThrow(
        'Validation error: deepLink.hash is not defined.',
      );
      await expect(w.validateRecord({ data: dl.data, key_id: keyId })).resolves.toBeUndefined();
      await expect(w.validateRecord({ data: {}, key_id: 99999 })).resolves.toBeUndefined();
      const off = new PLinkAfterhandlerWorker({ ...cfg(), isActive: false }, model);
      await expect(off.validateRecord({ data: {}, key_id: keyId })).resolves.toBeUndefined();
    });
  });

  describe('Hyperledger Fabric provider', () => {
    const make = () => new HyperledgerFabricBlockchainProvider({ apiUrl: base, headers: { 'X-H': 'h' } });
    beforeEach(() => {
      seen = [];
      setRespond(() => ({ status: 200, body: { ok: true } }));
    });

    it('exposes name and defaults', () => {
      expect(HyperledgerFabricBlockchainProvider.providerName).toBe('hyperledger-fabric');
      const p = new HyperledgerFabricBlockchainProvider({});
      expect(p.apiUrl).toBe('http://openenvironment.itl-dev.com:3003');
      expect(p.timeout).toBe(10000);
      expect(p.headers.Accept).toBe('application/json');
    });

    it('getData GETs the document by blockchain id', async () => {
      const p = make();
      expect(await p.getData('record', 'r1')).toEqual({ ok: true });
      expect(seen[0].method).toBe('GET');
      expect(seen[0].url).toBe(`/api/documents/${p.getBlockchainDataId('record', 'r1')}`);
      expect(seen[0].headers['x-h']).toBe('h');
    });

    it('createData and updateData send the document payload', async () => {
      const p = make();
      await p.createData('record', 'r1', 'u1', { a: 1 });
      await p.updateData('record', 'r1', 'u1', { a: 2 });
      expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual(['POST /api/documents', 'PUT /api/documents']);
      const b = JSON.parse(seen[0].body);
      expect(b).toEqual({
        id: p.getBlockchainDataId('record', 'r1'),
        name: p.getBlockchainDataName('record'),
        issuerId: 'u1',
        documentData: { a: 1 },
      });
      expect(JSON.parse(seen[1].body).documentData).toEqual({ a: 2 });
    });

    it('deleteData posts a revoke request', async () => {
      const p = make();
      await p.deleteData('record', 'r1', 'u1');
      expect(seen[0].method).toBe('POST');
      expect(seen[0].url).toBe('/api/documents/revoke');
      expect(JSON.parse(seen[0].body)).toEqual({ id: p.getBlockchainDataId('record', 'r1'), revokeReason: 'u1' });
    });

    it('all operations swallow HTTP errors and return undefined', async () => {
      setRespond(() => ({ status: 500, body: {} }));
      const p = make();
      expect(await p.getData('record', 'r1')).toBeUndefined();
      expect(await p.createData('record', 'r1', 'u', {})).toBeUndefined();
      expect(await p.updateData('record', 'r1', 'u', {})).toBeUndefined();
      expect(await p.deleteData('record', 'r1', 'u')).toBeUndefined();
    });
  });

  describe('Afterhandler service', () => {
    let svc: any;
    let originalWorkers: any[];
    beforeAll(() => {
      svc = (global as any).afterhandler;
      originalWorkers = svc.workers;
    });
    afterEach(() => {
      svc.workers = originalWorkers;
      jest.restoreAllMocks();
    });

    it('is a singleton and lists worker classes', () => {
      expect(new (svc.constructor as any)({}, null, null)).toBe(svc);
      expect(svc.constructor.WorkersClasses).toHaveLength(3);
      expect(svc.constructor.redisReindexPrefix).toBe('register:afterhandlerReindexing');
    });

    it('validateRecord requires record and operation and runs every worker', async () => {
      await expect(svc.validateRecord(null, 'create')).rejects.toThrow('Record is not defined.');
      await expect(svc.validateRecord({}, '')).rejects.toThrow('Operation is not defined.');
      const calls: any[] = [];
      svc.workers = [{ validateRecord: async (r, o) => calls.push([r, o]) }];
      await svc.validateRecord({ a: 1 }, 'create');
      expect(calls).toEqual([[{ a: 1 }, 'create']]);
    });

    it('reindex flag works in redis and in-memory modes', async () => {
      await svc.markKeyReindexStart(4242);
      expect(await svc.isKeyReindexing(4242)).toBe(true);
      await svc.markKeyReindexStop(4242);
      expect(await svc.isKeyReindexing(4242)).toBe(false);
      const cfg = (global as any).config;
      const saved = cfg.redis.isEnabled;
      cfg.redis.isEnabled = false;
      try {
        await svc.markKeyReindexStart(4243);
        expect(svc.keyReindexing[4243]).toBe(true);
        expect(await svc.isKeyReindexing(4243)).toBe(true);
        await svc.markKeyReindexStop(4243);
        expect(await svc.isKeyReindexing(4243)).toBe(false);
      } finally {
        cfg.redis.isEnabled = saved;
      }
    });

    const fastWait = () => {
      const real = global.setTimeout;
      jest.spyOn(global, 'setTimeout').mockImplementation(((fn: any, ms?: number, ...a: any[]) => real(fn, ms === 5e3 ? 0 : ms, ...a)) as any);
    };

    it('reindex resets and adds every record for the selected worker types', async () => {
      fastWait();
      const adds: string[] = [];
      const resets: any[] = [];
      const w1 = { afterhandlerType: 'elastic', reindexReset: async (k, o) => resets.push([k, o]), reindexAdd: async (r) => adds.push(r.id) };
      const w2 = { afterhandlerType: 'plink', reindexReset: async () => resets.push('plink'), reindexAdd: async () => adds.push('plink') };
      svc.workers = [w1, w2];
      const ok = await svc.reindex(keyId, { types: ['elastic'], extra: 1 });
      expect(ok).toBe(true);
      expect(resets).toEqual([[keyId, { extra: 1 }]]);
      expect(adds).toEqual([recordId]);
      expect(await svc.isKeyReindexing(keyId)).toBe(false);
    });

    it('reindex returns false and stops the flag when a worker fails', async () => {
      fastWait();
      svc.workers = [
        {
          afterhandlerType: 'elastic',
          reindexReset: async () => true,
          reindexAdd: async () => {
            throw new Error('index failed');
          },
        },
      ];
      expect(await svc.reindex(keyId)).toBe(false);
      expect(await svc.isKeyReindexing(keyId)).toBe(false);
      const last = await model.getLastByKeyId(keyId);
      expect(last.error_message).toBe('Error: index failed');
    });

    it('init builds workers only for configured types and starts them', () => {
      const started: string[] = [];
      const Svc: any = svc.constructor;
      const orig = Svc.WorkersClasses;
      const fake = (type: string) =>
        class {
          static get afterhandlerType() {
            return type;
          }
          start() {
            started.push(type);
          }
        };
      jest.spyOn(Svc, 'WorkersClasses', 'get').mockReturnValue([fake('a'), fake('b')] as any);
      const saved = svc.config;
      svc.config = { a: { isActive: false } };
      try {
        svc.init();
        expect(svc.workers).toHaveLength(1);
        expect(started).toEqual(['a']);
      } finally {
        svc.config = saved;
      }
      expect(orig).toHaveLength(3);
    });
  });

  describe('config_guard', () => {
    const basic = (s: string) => `Basic ${Buffer.from(s).toString('base64')}`;
    const knownDefault = 'Basic ' + 'cmVnaXN0ZXI6';

    it('checkAuthConfig flags empty, non-string, placeholder and weak tokens', () => {
      expect(checkAuthConfig({ auth: { tokens: [] } } as any)).toEqual(['auth.tokens is empty: at least one Basic auth token must be configured.']);
      expect(checkAuthConfig({} as any)).toHaveLength(1);
      const problems = checkAuthConfig(
        {
          auth: {
            tokens: ['  ', 5 as any, 'changeme', basic('u:short'), basic('u:<REDACTED>'), basic('nocolon'), basic('u:long-enough-pass'), 'Bearer x'],
          },
        } as any,
        'dev',
      );
      expect(problems).toEqual([
        'auth.tokens[0] is empty or not a string.',
        'auth.tokens[1] is empty or not a string.',
        'auth.tokens[2] is a placeholder value.',
        'auth.tokens[3] password is shorter than 8 characters.',
        'auth.tokens[4] decodes to a placeholder value.',
        'auth.tokens[5] password is shorter than 8 characters.',
      ]);
      expect(knownDefault).toBeTruthy();
    });

    it('checkAuthConfig refuses the known default token only in production', () => {
      const tokens = ['Basic ' + 'cmVnaXN0ZXI6cGFzc3dvcmQ='];
      const crypto = require('node:crypto');
      const { KNOWN_DEFAULT_TOKEN_HASHES } = require('../src/lib/config_guard');
      const hash = crypto.createHash('sha256').update(tokens[0]).digest('hex');
      const cfg: any = { auth: { tokens } };
      if (KNOWN_DEFAULT_TOKEN_HASHES.includes(hash)) {
        expect(checkAuthConfig(cfg, 'production')[0]).toContain('publicly known default token');
      }
      KNOWN_DEFAULT_TOKEN_HASHES.push(hash);
      try {
        expect(checkAuthConfig(cfg, 'production')[0]).toBe(
          'auth.tokens[0] is a publicly known default token from the repository, rotate it (or set auth.allowKnownDefaultToken=true).',
        );
        expect(checkAuthConfig(cfg, 'prod')).toHaveLength(1);
        expect(checkAuthConfig(cfg, 'development')).toEqual([]);
        expect(checkAuthConfig({ auth: { tokens, allowKnownDefaultToken: true } } as any, 'production')).toEqual([]);
      } finally {
        KNOWN_DEFAULT_TOKEN_HASHES.pop();
      }
    });

    it('checkEncryptionConfig validates key presence and format', () => {
      const key = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
      expect(checkEncryptionConfig({ encryption: { key: '<REDACTED>' } } as any, false)).toEqual(['encryption.key is a placeholder value.']);
      expect(checkEncryptionConfig({ encryption: { key: '' } } as any, false)).toEqual([]);
      expect(checkEncryptionConfig({ encryption: { key: '' } } as any, true)).toEqual(['encryption.key is empty but encrypted register keys exist.']);
      expect(checkEncryptionConfig({ encryption: { key: 'abc', check_on_startup: true } } as any, false)).toEqual([
        'encryption.key must be 64 hex characters or base64 of 32 bytes (AES-256), but encryption.check_on_startup is enabled.',
      ]);
      expect(checkEncryptionConfig({ encryption: { key } } as any, true)).toEqual([]);
      expect(checkEncryptionConfig(undefined as any, true)).toEqual(['encryption.key is empty but encrypted register keys exist.']);
    });

    it('assertSafeConfig and assertEncryptionConfig throw one combined error', () => {
      const good: any = { auth: { tokens: [basic('u:long-enough-pass')] }, encryption: { key: '' } };
      expect(() => assertSafeConfig(good, 'dev')).not.toThrow();
      expect(() => assertSafeConfig({ auth: { tokens: [] }, encryption: { key: 'changeme' } } as any, 'dev')).toThrow(
        'Invalid register configuration: auth.tokens is empty: at least one Basic auth token must be configured. encryption.key is a placeholder value.',
      );
      expect(() => assertEncryptionConfig(good, true)).toThrow(
        'Invalid register configuration: encryption.key is empty but encrypted register keys exist.',
      );
      expect(() => assertEncryptionConfig(good, false)).not.toThrow();
    });

    it('warnPlainHttpSign and warnEmptySignToken warn only in production', () => {
      const save = jest.fn();
      (global as any).log = { save };
      try {
        expect(warnPlainHttpSign({ sign: { url: 'http://s' } } as any, 'production')).toBe(true);
        expect(save).toHaveBeenCalledWith('sign-plain-http', expect.objectContaining({ key: 'sign.url' }), 'warn');
        expect(warnPlainHttpSign({ sign: { url: 'http://s' } } as any, 'dev')).toBe(false);
        expect(warnPlainHttpSign({ sign: { url: 'http://s' } } as any, undefined)).toBe(false);
        expect(warnPlainHttpSign({ sign: { url: 'http://s', allowPlainHttp: true } } as any, 'prod')).toBe(false);
        expect(warnPlainHttpSign({ sign: { url: 'https://s' } } as any, 'prod')).toBe(false);
        expect(warnPlainHttpSign({} as any, 'prod')).toBe(false);

        expect(warnEmptySignToken({ sign: { token: '' } } as any, 'production')).toBe(true);
        expect(save).toHaveBeenCalledWith('sign-empty-token', expect.objectContaining({ key: 'sign.token' }), 'warn');
        expect(warnEmptySignToken({ sign: { token: 'changeme' } } as any, 'prod')).toBe(true);
        expect(warnEmptySignToken({ sign: { token: 'real-secret' } } as any, 'prod')).toBe(false);
        expect(warnEmptySignToken({ sign: { token: '', allowEmptyToken: true } } as any, 'prod')).toBe(false);
        expect(warnEmptySignToken({ sign: { token: '' } } as any, 'dev')).toBe(false);
      } finally {
        delete (global as any).log;
      }
    });
  });

  describe('service_permissions', () => {
    it('checkServicePermissionsConfig validates the shape', () => {
      expect(checkServicePermissionsConfig(undefined)).toEqual([]);
      expect(checkServicePermissionsConfig({ strict: 'yes' } as any)).toEqual(['auth.strict must be a boolean.']);
      expect(checkServicePermissionsConfig({ servicePermissions: 'x' } as any)).toEqual(['auth.servicePermissions must be an object.']);
      expect(checkServicePermissionsConfig({ servicePermissions: [] } as any)).toEqual(['auth.servicePermissions must be an object.']);
      expect(
        checkServicePermissionsConfig({
          servicePermissions: { a: 'x', b: { routes: 'x', keys: 'y' }, c: { routes: [1], keys: [{}] }, d: { routes: ['*'], keys: [1, 'a'] } },
        } as any),
      ).toEqual([
        'auth.servicePermissions.a must be an object.',
        'auth.servicePermissions.b.routes must be an array of strings.',
        'auth.servicePermissions.b.keys must be an array of key ids.',
        'auth.servicePermissions.c.routes must be an array of strings.',
        'auth.servicePermissions.c.keys must be an array of key ids.',
      ]);
    });

    it('listUnrestrictedUsers excludes users with permissions or limited access', () => {
      const b = (s: string) => `Basic ${Buffer.from(s).toString('base64')}`;
      expect(
        listUnrestrictedUsers({
          tokens: [b('a:1'), b('b:2'), b('c:3'), b('bad:1:2'), 'Bearer x', 'Basic', 5 as any],
          servicePermissions: { b: { routes: [] } },
          limitedAccess: [{ user: 'c' }],
        } as any),
      ).toEqual(['a']);
      expect(listUnrestrictedUsers(undefined)).toEqual([]);
    });

    it('authorizeRequest enforces strict destructive routes, routes and keys', () => {
      const a: any = {
        strict: true,
        trustedCallers: ['boss'],
        servicePermissions: {
          reader: { routes: ['GET /records', 'GET /keys/:id'], keys: [5, '6'] },
          wild: { routes: ['*'] },
          none: {},
        },
      };
      const req = (method: string, url: string, extra: object = {}) => ({ method, url, ...extra });
      expect(authorizeRequest(a, 'x', req('delete', '/records/1', { route: { path: '/records/:id' } }))).toEqual({
        allowed: false,
        reason: 'destructive-route-requires-trusted-caller',
        route: 'DELETE /records/:id',
      });
      expect(authorizeRequest(a, 'boss', req('delete', '/records/1', { route: { path: '/records/:id' } })).allowed).toBe(true);
      expect(authorizeRequest(a, 'anyone', req('get', '/anything?x=1'))).toEqual({ allowed: true, route: 'GET /anything' });
      expect(authorizeRequest(a, 'none', req('get', '/records')).reason).toBe('route-not-allowed');
      expect(authorizeRequest(a, 'wild', req('post', '/whatever')).allowed).toBe(true);
      expect(authorizeRequest(a, 'reader', req('post', '/records')).reason).toBe('route-not-allowed');
      expect(authorizeRequest(a, 'reader', req('get', '/records', { query: { key_id: '5' } })).allowed).toBe(true);
      expect(authorizeRequest(a, 'reader', req('get', '/records', { query: { key_id: 6 } })).allowed).toBe(true);
      expect(authorizeRequest(a, 'reader', req('get', '/records', { body: { keyId: 5 } })).allowed).toBe(true);
      expect(authorizeRequest(a, 'reader', req('get', '/records', { query: { key_id: '7' } })).reason).toBe('key-not-allowed');
      expect(authorizeRequest(a, 'reader', req('get', '/records')).reason).toBe('key-not-allowed');
      expect(authorizeRequest(a, 'reader', req('get', '/records', { query: { key_id: ['5'] } })).reason).toBe('key-not-allowed');
      expect(authorizeRequest(a, 'reader', req('get', '/records', { query: { key_id: { a: 1 } } })).reason).toBe('key-not-allowed');
      expect(authorizeRequest(a, 'reader', req('get', '/keys/5', { route: { path: '/keys/:id' }, params: { id: '5' } })).allowed).toBe(true);
      expect(authorizeRequest(a, 'reader', req('get', '/keys/9', { route: { path: '/keys/:id' }, params: { id: '9' } })).reason).toBe(
        'key-not-allowed',
      );
      expect(authorizeRequest(undefined, 'u', req('get', '/x')).allowed).toBe(true);
    });
  });

  describe('PgPubSub', () => {
    let ps: any;
    beforeAll(() => {
      ps = PgPubSub.getInstance();
    });

    it('is a singleton returning the same instance', () => {
      expect(new PgPubSub({} as any)).toBe(ps);
    });

    it('delivers NOTIFY payloads to subscribers and stops after unsubscribe', async () => {
      const got: any[] = [];
      await ps.subscribe('c_test_chan', (channel, data) => got.push([channel, data]));
      await ps.subscribe('c_test_chan', () => got.push('second'));
      const db = (global as any).db;
      await db.query(`SELECT pg_notify('c_test_chan', '{"id":1,"table":"t","action":"INSERT"}')`);
      await db.query(`SELECT pg_notify('c_test_chan', 'not-json')`);
      await db.query(`SELECT pg_notify('c_other_chan', '{}')`);
      await sleep(300);
      expect(got).toEqual([['c_test_chan', { id: 1, table: 't', action: 'INSERT' }], 'second']);
      await ps.unsubscribe('c_test_chan');
      await db.query(`SELECT pg_notify('c_test_chan', '{"id":2,"table":"t","action":"UPDATE"}')`);
      await sleep(200);
      expect(got).toHaveLength(2);
    });

    it('reconnect retries after a failed connect, resubscribes and clears the timer', async () => {
      const got: any[] = [];
      await ps.subscribe('c_re_chan', (c, d) => got.push(d));
      const origConfig = ps.config;
      ps.config = { ...origConfig, port: 1, retryConnectionTime: 50 };
      await ps.reconnect();
      expect(ps.isReconnecting).toBe(true);
      expect(ps.client).toBeNull();
      await ps.reconnect(); // timer already set, no-op
      await sleep(250);
      expect(ps.reconnectAttempts).toBeGreaterThan(0);
      ps.config = { ...origConfig, retryConnectionTime: 50 };
      for (let i = 0; i < 40 && ps.reconnectTimer; i++) await sleep(50);
      expect(ps.reconnectTimer).toBeNull();
      expect(ps.isReconnecting).toBe(false);
      expect(ps.reconnectAttempts).toBe(0);
      ps.config = origConfig;
      await (global as any).db.query(`SELECT pg_notify('c_re_chan', '{"id":3,"table":"t","action":"DELETE"}')`);
      await sleep(300);
      expect(got).toEqual([{ id: 3, table: 't', action: 'DELETE' }]);
      await ps.unsubscribe('c_re_chan');
    }, 30000);

    it('reconnect logs when ending the current client fails', async () => {
      const saved = ps.client;
      const origConfig = ps.config;
      ps.client = {
        end: async () => {
          throw new Error('end failed');
        },
      };
      ps.config = { ...origConfig, retryConnectionTime: 30 };
      await ps.reconnect();
      for (let i = 0; i < 60 && ps.reconnectTimer; i++) await sleep(50);
      expect(ps.reconnectTimer).toBeNull();
      ps.config = origConfig;
      expect(saved).toBeTruthy();
    }, 30000);
  });
});

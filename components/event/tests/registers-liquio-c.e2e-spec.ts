import { Readable } from 'node:stream';

import nock from 'nock';
import { Sandbox } from '@liquio/back-core';

import { LiquioProvider } from '../src/services/event/requester/registers/providers/liquio';
import { FILE_DOCUMENT_TEMPLATE_ID } from '../src/constants/common';
import { TestApp } from './test-app';

const REG = 'http://reg.test';

describe('Group C - liquio registers provider', () => {
  let app: TestApp;
  let provider: LiquioProvider;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    LiquioProvider.singleton = undefined as any;
    provider = new LiquioProvider({ url: REG, token: 'fake-token', apiMethods: { ping: '/ping2' } });
  });
  afterAll(async () => {
    await TestApp.afterAll(app);
  });
  afterEach(async () => {
    provider.sandbox = undefined;
    jest.restoreAllMocks();
    nock.cleanAll();
    await TestApp.afterEach(app);
  });
  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  // The real sandbox invokes the evaluated function with no arguments, so a record filter factory is stubbed.
  const useFilterSandbox = (filter: (record: any, documents: any, events: any) => any) => {
    provider.sandbox = { evalWithArgs: jest.fn(() => filter) };
  };
  const useSandbox = () => {
    provider.sandbox = Sandbox.getInstance();
  };
  const ctx = (extra: any = {}, schema: any = {}): any => ({
    documents: [],
    events: [],
    workflowId: 'wf-1',
    eventTemplateJsonSchemaObject: schema,
    ...extra,
  });
  const decodeAccessInfo = (value: string) => JSON.parse(Buffer.from(value, 'base64').toString('utf8'));

  it('is a singleton, merging api methods and headers', () => {
    expect(new LiquioProvider({ url: 'http://other' })).toBe(provider);
    expect(provider.apiMethods.ping).toBe('/ping2');
    expect(provider.apiMethods.getRecord).toBe('/records');
    expect(provider.headers).toEqual({ 'Content-Type': 'application/json', token: 'fake-token' });
  });

  describe('query helpers', () => {
    it('getIndexFieldsQueryParams joins only set fields', () => {
      expect(provider.getIndexFieldsQueryParams({})).toBe('');
      expect(
        provider.getIndexFieldsQueryParams({
          searchEqual: 'a',
          searchEqual2: 'b',
          searchEqual3: 'c',
          searchLike: 'd',
          searchLike2: 'e',
          searchLike3: 'f',
        }),
      ).toBe('&search_equal=a&search_equal_2=b&search_equal_3=c&search=d&search_2=e&search_3=f');
    });

    it('getHeadersWithTraceId adds a trace id header', () => {
      expect(provider.getHeadersWithTraceId()).toMatchObject({ token: 'fake-token' });
      expect(Object.keys(provider.getHeadersWithTraceId())).toContain('x-trace-id');
    });

    it('getAccessInfo and additionalFilter throw a TypeError for string functions because the sandbox is never assigned', async () => {
      expect(provider.sandbox).toBeUndefined();
      expect(() => provider.getAccessInfo(ctx({}, { accessInfo: '() => ({})' }))).toThrow(TypeError);
      nock(REG).get('/records').query(true).reply(200, { data: [] });
      await expect(provider.getRecords({ registerId: 1, keyId: 2 }, ctx({}, { additionalFilter: '() => true' }))).rejects.toThrow(TypeError);
    });

    it('getAccessInfo: object, function and default access info', () => {
      useSandbox();
      const a = provider.getAccessInfo(ctx({}, { accessInfo: { role: 'r' } }));
      expect(a).toMatchObject({ role: 'r', workflowId: 'wf-1' });
      expect(typeof a.requestAt).toBe('string');
      const f = provider.getAccessInfo(ctx({ documents: [1] }, { accessInfo: '(documents, events) => ({ count: documents.length })' }));
      expect(f).toMatchObject({ count: 1, workflowId: 'wf-1' });
      expect(provider.getAccessInfo(ctx())).toMatchObject({ workflowId: 'wf-1' });
    });

    it('getHeadersWithAccessInfo encodes access info as base64 json', () => {
      const headers = provider.getHeadersWithAccessInfo(ctx({}, { accessInfo: { x: 1 } }));
      expect(decodeAccessInfo(headers['access-info'])).toMatchObject({ x: 1, workflowId: 'wf-1' });
    });

    it('prepareResponse returns data, throws error message, or nothing', () => {
      expect(provider.prepareResponse({ data: [1] })).toEqual([1]);
      expect(() => provider.prepareResponse({ error: { message: 'bad' } })).toThrow('bad');
      expect(provider.prepareResponse({})).toBeUndefined();
    });
  });

  describe('getRecords / countRecords', () => {
    it('GET: builds the full query string', async () => {
      const scope = nock(REG)
        .get('/records')
        .query((q) => {
          expect(q).toMatchObject({
            register_id: '1',
            key_id: '2',
            allow_see_all_records: 'true',
            record_id: 'r1',
            record_ids_list: '["a","b"]',
            'data[p.q]': '["x","y"]',
            'data[f1]': 'v1',
            'data[_filters_type]': 'or',
            search_equal: 'se',
            'sort[name]': 'asc',
            limit: '5',
          });
          return true;
        })
        .matchHeader('token', 'fake-token')
        .reply(200, { data: [{ id: 1 }, { id: 2 }] });
      const result = await provider.getRecords(
        {
          registerId: 1,
          keyId: 2,
          recordId: 'r1',
          recordIdsList: ['a', 'b'],
          path: 'p.q',
          name: ['x', 'y'],
          filters: [{ path: 'f1', name: 'v1' }],
          filtersType: 'or',
          searchEqual: 'se',
          sort: { name: 'asc' },
          limit: 5,
        },
        ctx(),
      );
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(scope.isDone()).toBe(true);
    });

    it('GET: defaults to sort=null and limit 10, scalar name, and slices to limit', async () => {
      nock(REG)
        .get('/records')
        .query((q) => q['data[p]'] === 'n' && q.sort === 'null' && q.limit === '1')
        .reply(200, { data: [{ id: 1 }, { id: 2 }] });
      expect(await provider.getRecords({ registerId: 1, keyId: 2, path: 'p', name: 'n', limit: 1 }, ctx())).toEqual([{ id: 1 }]);
    });

    it('GET: applies additionalFilter with limit 100000 and a compare function', async () => {
      useFilterSandbox((record: any) => record.v > 0);
      nock(REG)
        .get('/records')
        .query((q) => q.limit === '100000')
        .reply(200, { data: [{ v: 3 }, { v: 1 }, { v: 2 }, { v: 0 }] });
      const result = await provider.getRecords(
        { registerId: 1, keyId: 2, limit: 2, compareFunction: (a: any, b: any) => a.v - b.v },
        ctx({}, { additionalFilter: 'FILTER' }),
      );
      expect(result).toEqual([{ v: 1 }, { v: 2 }]);
    });

    it('GET: logs and rethrows an additionalFilter error', async () => {
      useFilterSandbox((record: any) => record.missing.deep);
      nock(REG)
        .get('/records')
        .query(true)
        .reply(200, { data: [{ v: 1 }] });
      await expect(provider.getRecords({ registerId: 1, keyId: 2 }, ctx({}, { additionalFilter: 'FILTER' }))).rejects.toThrow();
      expect(app.log.logs.find((l) => l.type === 'get-records-from-registers|error-calling-additional-filter-function')).toBeDefined();
    });

    it('POST: sends a body with merged filters', async () => {
      const scope = nock(REG)
        .post('/records-by-post', (body) => {
          expect(body).toMatchObject({
            register_id: 1,
            key_id: 2,
            allow_see_all_records: true,
            data: { p: 'n', f: 'v' },
            search_equal: 'se',
            search: 'sl',
            sort: 'null',
            limit: 10,
          });
          return true;
        })
        .reply(200, { data: [{ id: 1 }] });
      const result = await provider.getRecords(
        { registerId: 1, keyId: 2, path: 'p', name: 'n', filters: [{ path: 'f', name: 'v' }], searchEqual: 'se', searchLike: 'sl' },
        ctx({ requestMethod: 'POST' }),
      );
      expect(result).toEqual([{ id: 1 }]);
      expect(scope.isDone()).toBe(true);
    });

    it('rejects an unknown request method', async () => {
      await expect(provider.getRecords({ registerId: 1, keyId: 2 }, ctx({ requestMethod: 'PUT' }))).rejects.toThrow(
        'LiquioProvider.getRecords: Unknown requestMethod: PUT.',
      );
    });

    it('logs and rethrows http errors with the response body as message', async () => {
      nock(REG).get('/records').query(true).reply(500, { error: 'boom' });
      await expect(provider.getRecords({ registerId: 1, keyId: 2 }, ctx())).rejects.toThrow('boom');
      expect(app.log.logs.find((l) => l.type === 'get-records-from-registers|error')).toBeDefined();
    });

    it('countRecords returns meta.count', async () => {
      nock(REG)
        .get('/records')
        .query(true)
        .reply(200, { data: [], meta: { count: 42 } });
      expect(await provider.countRecords({ registerId: 1, keyId: 2 }, ctx())).toBe(42);
    });
  });

  describe('findRecords / getRecord / getKeyById', () => {
    it('findRecords: stringifies query, sends body and returns data', async () => {
      nock(REG)
        .get('/records')
        .query({ a: '1', 'b[c]': '2' })
        .reply(200, { data: [1] });
      expect(await provider.findRecords({ a: 1, b: { c: 2 } }, undefined)).toEqual({ data: [1] });
    });

    it('findRecords: logs and rethrows errors', async () => {
      nock(REG).get('/records').query(true).reply(500, {});
      await expect(provider.findRecords({ a: 1 }, undefined)).rejects.toThrow('500');
      expect(app.log.logs.find((l) => l.type === 'liquio-register-provider|find-records|error')).toBeDefined();
    });

    it('getRecord returns data or rethrows', async () => {
      nock(REG)
        .get('/records/r1')
        .reply(200, { data: { id: 'r1' } });
      expect(await provider.getRecord('r1')).toEqual({ id: 'r1' });
      nock(REG).get('/records/r2').reply(404, { error: 'missing' });
      await expect(provider.getRecord('r2')).rejects.toThrow('missing');
      expect(app.log.logs.find((l) => l.type === 'get-from-registers|error')).toBeDefined();
    });

    it('getKeyById returns data or rethrows', async () => {
      nock(REG)
        .get('/keys/k1')
        .reply(200, { data: { id: 'k1' } });
      expect(await provider.getKeyById('k1')).toEqual({ id: 'k1' });
      nock(REG).get('/keys/k2').reply(404, { error: 'nokey' });
      await expect(provider.getKeyById('k2')).rejects.toThrow('nokey');
      expect(app.log.logs.find((l) => l.type === 'get-key-from-registers|error')).toBeDefined();
    });
  });

  describe('create / update / delete', () => {
    it('createRecord posts the record with access info', async () => {
      const scope = nock(REG)
        .post('/records', { registerId: 1, data: { a: 1 } })
        .reply(200, function () {
          expect(decodeAccessInfo(this.req.headers['access-info'] as string)).toMatchObject({ workflowId: 'wf-1', who: 'me' });
          return { data: { id: 'new' } };
        });
      expect(await provider.createRecord({ registerId: 1, data: { a: 1 } }, ctx({}, { accessInfo: { who: 'me' } }))).toEqual({ data: { id: 'new' } });
      expect(scope.isDone()).toBe(true);
    });

    it('createRecord logs and rethrows', async () => {
      nock(REG).post('/records').reply(500, { error: 'cr' });
      await expect(provider.createRecord({ a: 1 }, ctx())).rejects.toThrow('cr');
      expect(app.log.logs.find((l) => l.type === 'save-to-registers|error')).toBeDefined();
    });

    it('updateRecord merges data by property path into the existing record', async () => {
      nock(REG)
        .get('/records/r1')
        .reply(200, { data: { data: { keep: 1, nested: { a: 1 } } } });
      const scope = nock(REG)
        .put('/records/r1', (body) => {
          expect(body.data).toEqual({ keep: 1, nested: { a: 1 }, new: 'v' });
          return true;
        })
        .reply(200, { data: { ok: true } });
      const result = await provider.updateRecord('r1', { data: { new: 'v' } }, ctx());
      expect(result).toEqual({ data: { ok: true } });
      expect(scope.isDone()).toBe(true);
    });

    it('updateRecord fails when the record has no data', async () => {
      nock(REG).get('/records/r1').reply(200, {});
      await expect(provider.updateRecord('r1', { data: {} }, ctx())).rejects.toThrow('Can not find existing record data.');
      expect(app.log.logs.find((l) => l.type === 'get-data-from-registers|error')).toBeDefined();
    });

    it('updateRecord logs and rethrows put errors', async () => {
      nock(REG)
        .get('/records/r1')
        .reply(200, { data: { data: { a: 1 } } });
      nock(REG).put('/records/r1').reply(500, { error: 'put-bad' });
      await expect(provider.updateRecord('r1', { data: { b: 2 } }, ctx())).rejects.toThrow('put-bad');
      expect(app.log.logs.find((l) => l.type === 'update-in-registers|error')).toBeDefined();
    });

    it('deleteRecord sends DELETE or rethrows', async () => {
      nock(REG).delete('/records/r1').reply(200, { data: 'deleted' });
      expect(await provider.deleteRecord('r1', ctx())).toEqual({ data: 'deleted' });
      nock(REG).delete('/records/r2').reply(500, { error: 'del-bad' });
      await expect(provider.deleteRecord('r2', ctx())).rejects.toThrow('del-bad');
      expect(app.log.logs.find((l) => l.type === 'delete-from-registers|error')).toBeDefined();
    });
  });

  describe('sendPingRequest', () => {
    it('returns version info from response headers', async () => {
      nock(REG).get('/ping2').reply(200, { pong: true }, { version: '1.2.3', customer: 'cust', environment: 'test' });
      expect(await provider.sendPingRequest()).toEqual({ version: '1.2.3', customer: 'cust', environment: 'test', body: { pong: true } });
    });

    it('returns undefined and logs when the request fails', async () => {
      nock(REG).get('/ping2').reply(500, {});
      expect(await provider.sendPingRequest()).toBeUndefined();
      expect(app.log.logs.find((l) => l.type === 'send-ping-request-to-register')).toBeDefined();
    });
  });

  describe('saveRecordsToCsv', () => {
    const csvStream = () => Readable.from(['a,b\n1,2\n']);
    let filestorage: any;
    let documentModel: any;
    let eventModel: any;

    beforeEach(() => {
      filestorage = { uploadFileFromStream: jest.fn(async () => ({ id: 'csv-file', name: 'records', contentType: 'text/csv; charset=utf-8' })) };
      documentModel = { create: jest.fn(async (v) => ({ id: 'doc-csv', ...v })) };
      eventModel = { setDocumentIdByWorkflowIdAndEventTemplateId: jest.fn(async () => ({ updated: 1 })) };
    });

    const run = (extra: any = {}) =>
      provider.saveRecordsToCsv({
        filestorage,
        documentModel,
        eventModel,
        workflowId: 'wf-1',
        eventTemplateId: 5,
        registerId: 1,
        keyId: 2,
        ...extra,
      });

    it('downloads the csv stream and saves it as a document on the event', async () => {
      const scope = nock(REG)
        .post('/records/filter')
        .query((q) => {
          expect(q).toMatchObject({
            register_id: '1',
            key_id: '2',
            allow_see_all_records: 'true',
            'data[a.b]': 'x',
            search_equal: 'se',
            additional_filter: encodeURIComponent(Buffer.from('(r) => true').toString('base64')),
            'sort[name]': 'desc',
            csv_map: '{"a":"b"}',
            no_limit: 'true',
          });
          return true;
        })
        .reply(200, () => csvStream());
      const result = await run({
        filters: [{ path: 'a.b', name: 'x' }, { path: 'skip' }],
        searchEqual: 'se',
        additionalFilter: '(r) => true',
        sort: { name: 'desc' },
        csvMap: '{"a":"b"}',
        noLimit: true,
      });
      expect(scope.isDone()).toBe(true);
      expect(filestorage.uploadFileFromStream).toHaveBeenCalledWith(
        expect.anything(),
        'records',
        undefined,
        'text/csv; charset=utf-8',
        undefined,
        true,
      );
      expect(documentModel.create).toHaveBeenCalledWith({
        documentTemplateId: FILE_DOCUMENT_TEMPLATE_ID,
        fileId: 'csv-file',
        name: 'records',
        fileType: 'text/csv; charset=utf-8',
      });
      expect(eventModel.setDocumentIdByWorkflowIdAndEventTemplateId).toHaveBeenCalledWith('wf-1', 5, 'doc-csv');
      expect(result).toMatchObject({ savedDocument: { id: 'doc-csv' }, saveToEventResult: { updated: 1 } });
    });

    it('uses defaults for csv_map and no_limit', async () => {
      nock(REG)
        .post('/records/filter')
        .query((q) => q.csv_map === '{}' && q.no_limit === 'false')
        .reply(200, () => csvStream());
      await run();
    });

    it('fails on a wrong content type from the file storage', async () => {
      nock(REG)
        .post('/records/filter')
        .query(true)
        .reply(200, () => csvStream());
      filestorage.uploadFileFromStream.mockResolvedValue({ id: 'f', name: 'n', contentType: 'text/plain' });
      await expect(run()).rejects.toThrow('File download. Wrong content type.');
      expect(documentModel.create).not.toHaveBeenCalled();
    });

    it('logs and rethrows a document create error', async () => {
      nock(REG)
        .post('/records/filter')
        .query(true)
        .reply(200, () => csvStream());
      documentModel.create.mockRejectedValue(new Error('db-bad'));
      await expect(run()).rejects.toThrow('db-bad');
      expect(app.log.logs.find((l) => l.type === 'get-csv-records-from-registers-save-document|error')).toBeDefined();
    });

    it('fails when the saved document has no id', async () => {
      nock(REG)
        .post('/records/filter')
        .query(true)
        .reply(200, () => csvStream());
      documentModel.create.mockResolvedValue({});
      await expect(run()).rejects.toThrow('Can not save document.');
    });

    it('logs and rethrows an http error', async () => {
      nock(REG).post('/records/filter').query(true).reply(500, 'x');
      await expect(run()).rejects.toThrow('500');
      expect(app.log.logs.find((l) => l.type === 'get-csv-records-from-registers|request-error')).toBeDefined();
      expect(app.log.logs.find((l) => l.type === 'get-csv-records-from-registers|error')).toBeDefined();
    });
  });
});

import { Readable } from 'node:stream';

import { AxiosError } from 'axios';
import { Sequelize } from 'sequelize';

import { Helpers } from '../src/lib/helpers';
import { RecordMap } from '../src/lib/record_map';
import { TestApp } from './test-app';

describe('Group D - helpers and record map', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
  });
  afterAll(async () => {
    await TestApp.afterAll(app);
  });

  describe('Helpers', () => {
    it('redacts headers', () => {
      expect(Helpers.redactHeaders({ Authorization: 'x', token: 'y', 'X-Api-Key': 'z', accept: 'a', 'x-session-cookie': 'c' })).toEqual({
        Authorization: '****',
        token: '****',
        'X-Api-Key': '****',
        accept: 'a',
        'x-session-cookie': '****',
      });
      expect(Helpers.redactHeaders(undefined)).toBeUndefined();
      expect(Helpers.redactHeaders(['a'])).toEqual(['a']);
      expect(Helpers.redactHeaders('str')).toBe('str');
    });

    it('redacts sensitive data deeply', () => {
      expect(Helpers.redactSensitiveData({ a: 1, password: 'p', n: { user_signature: 's', list: [{ secret: 1, ok: 2 }] } })).toEqual({
        a: 1,
        password: '****',
        n: { user_signature: '****', list: [{ secret: '****', ok: 2 }] },
      });
      expect(Helpers.redactSensitiveData('plain')).toBe('plain');
      expect(Helpers.redactSensitiveData(null)).toBeNull();
    });

    it('redacts request options', () => {
      expect(Helpers.redactRequestOptions(null)).toBeNull();
      expect(Helpers.redactRequestOptions('s')).toBe('s');
      const r = Helpers.redactRequestOptions({
        url: 'u',
        headers: { token: 't' },
        httpsAgent: {},
        agent: {},
        data: { password: 'p', v: 1 },
        body: Buffer.from('x'),
      });
      expect(r).toEqual({
        url: 'u',
        headers: { token: '****' },
        httpsAgent: undefined,
        agent: undefined,
        data: { password: '****', v: 1 },
        body: 'binary',
      });
      expect(Helpers.redactRequestOptions({ data: Readable.from(['a']) }).data).toBe('binary');
      expect(Helpers.redactRequestOptions({ url: 'u' }).data).toBeUndefined();
    });

    it('prepares response data to log', () => {
      expect(Helpers.prepareResponseDataToLog(Readable.from(['a']))).toBe('Readable stream');
      expect(Helpers.prepareResponseDataToLog(Buffer.from('a'))).toBe('binary');
      expect(Helpers.prepareResponseDataToLog(new ArrayBuffer(2))).toBe('binary');
      expect(Helpers.prepareResponseDataToLog(undefined)).toEqual({});
      expect(Helpers.prepareResponseDataToLog(null)).toEqual({});
      expect(Helpers.prepareResponseDataToLog('')).toEqual({});
      expect(Helpers.prepareResponseDataToLog({ token: 't', a: 'b' })).toEqual({ token: '****', a: 'b' });
    });

    it('masks query-style pairs in text bodies', () => {
      expect(Helpers.prepareResponseDataToLog('token=abc&x=1')).toBe('token=****&x=1');
      expect(Helpers.prepareResponseDataToLog('plain text')).toBe('plain text');
    });

    it('cuts long strings', () => {
      expect(Helpers.cutLongStrings('short')).toBe('short');
      expect(Helpers.cutLongStrings('a'.repeat(100))).toBe(`${'a'.repeat(77)}...`);
      expect(Helpers.cutLongStrings(5)).toBe(5);
      expect(Helpers.cutLongStrings('{"a":"b"}')).toEqual({ a: 'b' });
      expect(Helpers.cutLongStrings({ a: 'b' })).toEqual({ a: 'b' });
      expect(Helpers.cutLongStrings('"' + 'z'.repeat(100) + '"')).toBe(`${'z'.repeat(77)}...`);
    });

    it('cuts long object values progressively', () => {
      const obj = { a: 'x'.repeat(200), b: 'y'.repeat(200) };
      const cut = Helpers.cutLongStrings(obj);
      expect(JSON.stringify(cut).length).toBeLessThanOrEqual(80);
      expect(cut.a).toBe(`${'x'.repeat(7)}...`);
      const many: any = {};
      for (let i = 0; i < 20; i++) many[`k${i}`] = 'v'.repeat(50);
      const cut2 = Helpers.cutLongStrings(many);
      expect(typeof cut2 === 'string' || JSON.stringify(cut2).length <= 80).toBe(true);
      const arr = Helpers.cutLongStrings(['q'.repeat(300)]);
      expect(JSON.stringify(arr).length).toBeLessThanOrEqual(80);
      const huge: any = {};
      for (let i = 0; i < 200; i++) huge[`key${i}`] = 'v'.repeat(50);
      const cut3 = Helpers.cutLongStrings(huge, 2000);
      expect(typeof cut3 === 'string' ? cut3.length : JSON.stringify(cut3).length).toBeLessThanOrEqual(2000);
    });

    it('replaces object values and strips sequelize', () => {
      expect(Helpers.replaceObjValues({ a: [1, { b: 2 }] }, (v) => (typeof v === 'number' ? v * 2 : v))).toEqual({ a: [2, { b: 4 }] });
      expect(Helpers.replaceObjValues(3)).toBe(3);
      const seq = Object.create(Sequelize.prototype);
      expect(Helpers.stripSequelize({ s: seq, l: [seq, 1] })).toEqual({ s: '$Sequelize', l: ['$Sequelize', 1] });
      expect(Helpers.stripSequelize(5)).toBe(5);
    });

    it('isCorrectBufferMimeType rejects real Buffers because typeOf(Buffer) is uint8array (bug)', () => {
      const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
      expect(() => Helpers.isCorrectBufferMimeType(pdf, 'application/pdf')).toThrow('isCorrectBufferMimeType. Invalid buffer argument.');
      expect(() => Helpers.isCorrectBufferMimeType('x' as any, 'pdf')).toThrow('isCorrectBufferMimeType. Invalid buffer argument.');
    });

    it('sha256 hex', () => {
      expect(Helpers.getSha256HashHex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });

    it('prepares axios errors', () => {
      expect(Helpers.prepareAxiosErrorToLog(new Error('plain'))).toEqual({ error: 'Error: plain' });
      const e = new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        { url: '/x', baseURL: 'http://h', method: 'get', headers: { token: 't', a: 'b' } } as any,
        {},
        {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'nf', token: 'x' },
        } as any,
      );
      expect(Helpers.prepareAxiosErrorToLog(e)).toEqual({
        error: 'Request failed',
        code: 'ERR_BAD_REQUEST',
        status: 404,
        statusText: 'Not Found',
        responseData: { error: 'nf', token: '****' },
        url: 'http://h/x',
        method: 'GET',
      });
      expect(Helpers.prepareAxiosErrorToLog(e, { withHeaders: true }).headers).toEqual({ token: '****', a: 'b' });
      const bare = Helpers.prepareAxiosErrorToLog(new AxiosError());
      expect(bare.error).toBe('UNKNOWN_ERROR_MESSAGE');
      expect(bare.code).toBe('UNKNOWN_ERROR_CODE');
      expect(bare.status).toBe('UNKNOWN_ERROR_STATUS');
      expect(bare.method).toBe('');
      expect(Helpers.prepareAxiosErrorToLog(new AxiosError('m'), { withHeaders: true }).headers).toEqual({});
    });

    it('splits arrays into chunks', () => {
      expect(Helpers.splitArrayIntoChunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(Helpers.splitArrayIntoChunks([], 3)).toEqual([]);
    });

    it('stringifies errors', () => {
      expect(Helpers.stringifyError(new Error('x'))).toBe('Error: x');
      expect(Helpers.stringifyError(null as any)).toMatch(/^TypeError: /);
      const e = new AxiosError('bad', 'ERR_BAD_REQUEST', {} as any, {}, { status: 400, data: { message: 'Sign is required', token: 't' } } as any);
      expect(Helpers.stringifyError(e)).toBe('AxiosError - ERR_BAD_REQUEST - bad - {"message":"Sign is required","token":"****"}');
      expect(Helpers.stringifyAxiosError(new AxiosError('bad', 'C'))).toBe('AxiosError - C - bad');
      expect(Helpers.stringifyAxiosError(new AxiosError('bad', 'C', {} as any, {}, { status: 500, data: 'text body' } as any))).toBe(
        'AxiosError - C - bad - text body',
      );
      expect(Helpers.stringifyAxiosError(new AxiosError('bad', 'C', {} as any, {}, { status: 500, data: Readable.from(['a']) } as any))).toBe(
        'AxiosError - C - bad',
      );
      expect(Helpers.stringifyAxiosError(new Error('q'))).toBe('Error: q');
    });

    it('getSignaturesInfoByDocumentId fails when EDS service is unavailable', async () => {
      await expect(Helpers.getSignaturesInfoByDocumentId('d1')).rejects.toThrow(/^Cannot initialize EDS service\./);
    });

    it('transforms functions to async', () => {
      expect(Helpers.transformFunctionToAsync('(a) => a', ['fn'])).toBe('(a) => a');
      expect(Helpers.transformFunctionToAsync('() => fn(1)')).toBe('() => fn(1)');
      expect(Helpers.transformFunctionToAsync('() => await fn(1)', ['fn'])).toBe('() => await fn(1)');
      expect(Helpers.transformFunctionToAsync('() => fn(1) + x.fn(2)', ['fn'])).toBe('async () => await fn(1) + x.fn(2)');
      expect(Helpers.transformFunctionToAsync('async () => fn(1) + g(2)', ['fn', 'g'])).toBe('async () => await fn(1) + await g(2)');
    });

    it('escapes csv cells', () => {
      expect(Helpers.escapeCsvCell('a')).toBe('a');
      expect(Helpers.escapeCsvCell(null)).toBe('');
      expect(Helpers.escapeCsvCell(undefined)).toBe('');
      expect(Helpers.escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
      expect(Helpers.escapeCsvCell('-1')).toBe("'-1");
      expect(Helpers.escapeCsvCell(-1)).toBe('-1');
      expect(Helpers.escapeCsvCell(BigInt(5))).toBe('5');
      expect(Helpers.escapeCsvCell('a,b')).toBe('"a,b"');
      expect(Helpers.escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
      expect(Helpers.escapeCsvCell('@x,y')).toBe('"\'@x,y"');
      expect(Helpers.escapeCsvCell('l1\nl2')).toBe('"l1\nl2"');
    });
  });

  describe('RecordMap', () => {
    const docs = [
      { documentTemplateId: 'T1', data: { name: 'Ann', list: [{ v: 'a' }, { v: 'b' }], nul: null } },
      { documentTemplateId: 'T2', data: { x: 5 } },
    ];
    const mk = (raw: any, idx?: number) => new RecordMap(raw, docs, [], idx, 77);

    it('indexes documents by template id', () => {
      const rm = mk({});
      expect(Object.keys(rm.documentsByTemplateIds)).toEqual(['T1', 'T2']);
      expect(rm.eventTemplateId).toBe(77);
      expect(new RecordMap('x', docs).events).toEqual([]);
    });

    it('detects raw record kind', async () => {
      expect(mk('(d) => d').rawRecordIsFunctionString).toBe(true);
      expect(mk('nope').rawRecordIsFunctionString).toBe(false);
      expect(mk({}).rawRecordIsObject).toBe(true);
      expect(mk('nope').rawRecordIsObject).toBe(false);
      expect(await mk('nope').getRecord()).toBeUndefined();
    });

    it('evaluates a function-string record with real sandbox', async () => {
      const rec = await mk('(documents) => ({ n: documents.length })').getRecord();
      expect(rec).toEqual({ n: 2 });
    });

    it('builds object record from paths, ids and function strings', async () => {
      const rm = mk({
        recordId: 'rec-1',
        registerId: 5,
        keyId: 6,
        allowTokens: { read: ['a'] },
        person: { id: 'p' },
        map: {
          name: 'documents.T1.data.name',
          missing: 'documents.T1.data.nul',
          idn: 'id.number',
          notString: 12,
          fn: '(documents) => documents[1].data.x * 2',
        },
      });
      const rec = await rm.getRecord();
      expect(rec.recordId).toBe('rec-1');
      expect(rec.registerId).toBe(5);
      expect(rec.keyId).toBe(6);
      expect(rec.allowTokens).toEqual({ read: ['a'] });
      expect(rec.person).toEqual({ id: 'p' });
      expect(rec.data.name).toBe('Ann');
      expect(rec.data.missing).toBeUndefined();
      expect('notString' in rec.data).toBe(false);
      expect(rec.data.fn).toBe(10);
      expect(rec.data.idn).toBeGreaterThanOrEqual(100000000000);
      expect(rec.data.idn).toBeLessThanOrEqual(999999999999);
    });

    it('id.string always fails because Number#toString(base64) is invalid (bug)', async () => {
      const save = jest.spyOn(global.log, 'save').mockImplementation(() => undefined as any);
      await expect(mk({ map: { ids: 'id.string' } }).getRecord()).rejects.toThrow(
        'You have error on "map.ids". Details: "toString() radix argument must be between 2 and 36"!',
      );
      save.mockRestore();
    });

    it('uses recordIds fallback and array index substitution', async () => {
      const rm = mk(
        {
          recordIds: '(documents) => documents[0].data.list.map((i) => i.v)',
          allowTokens: '(documents) => ({ t: documents.length })',
          person: '(documents) => ({ p: documents[0].data.name })',
          map: { path: 'documents.T1.data.list.X.v', fn: '(documents) => documents[0].data.list[X].v' },
        },
        1,
      );
      const rec = await rm.getRecord();
      expect(rec.recordId).toBe('b');
      expect(rec.allowTokens).toEqual({ t: 2 });
      expect(rec.person).toEqual({ p: 'Ann' });
      expect(rec.data).toEqual({ path: 'b', fn: 'b' });
      const whole = await mk({ recordIds: '(documents) => documents.map((d) => d.documentTemplateId)', map: {} }).getRecord();
      expect(whole.recordId).toEqual(['T1', 'T2']);
      expect((await mk({ recordId: 7, map: {} }).getRecord()).recordId).toBe(7);
      expect((await mk({ recordId: 'plain', map: {} }).getRecord()).recordId).toBe('plain');
    });

    it('wraps map entry errors', async () => {
      const save = jest.spyOn(global.log, 'save').mockImplementation(() => undefined as any);
      const rm = mk({ map: { bad: '(documents) => { throw new Error("oops"); }' } });
      const err: any = await rm.getRecord().catch((e: any) => e);
      expect(err.message).toMatch(/^You have error on "map\.bad"\. Details: ".*oops.*"!$/);
      expect(err.cause).toBeDefined();
      expect(save.mock.calls.some((c) => c[0] === 'eval-error')).toBe(true);
      save.mockRestore();
    });

    it('rejects disallowed custom methods', async () => {
      const save = jest.spyOn(global.log, 'save').mockImplementation(() => undefined as any);
      const err: any = await mk({ map: { c: 'custom.evil.method' } })
        .getRecord()
        .catch((e: any) => e);
      expect(err.message).toContain('Passed customServiceAndMethod is not allowed');
      expect(err.cause.details).toEqual({
        allowedCustomMethods: ['courts.generate-executive-document-number'],
        passedCustomServiceAndMethod: 'evil.method',
      });
      save.mockRestore();
    });

    it('generates executive document number', async () => {
      const raw = { options: { executorIssuerCode: '() => "COURT7"' }, map: { num: 'custom.courts.generate-executive-document-number' } };
      const create = jest.spyOn(global.models.rawQueryModel, 'createSequence').mockResolvedValue(undefined as any);
      const next = jest.spyOn(global.models.rawQueryModel, 'getNextvalOfSequence').mockResolvedValue(42 as any);
      const year = new Date().getFullYear();
      const rec = await mk(raw).getRecord();
      expect(rec.data.num).toBe(`COURT7.${year}.0000042`);
      expect(create).toHaveBeenCalledWith(`courts_exetutive_doc_number_sequence_in_year_${year}`);
      expect(next).toHaveBeenCalledWith(`courts_exetutive_doc_number_sequence_in_year_${year}`);
      expect(await mk(raw).getSequenceNumberByYear(2001)).toBe(42);

      create.mockRejectedValueOnce(new Error('db down'));
      const e1: any = await mk(raw)
        .customCourtsGenerateExecutiveDocumentNumber()
        .catch((e: any) => e);
      expect(e1.message).toBe('db down');
      expect(e1.details).toBe("Can't get sequence number by year.");

      const e2: any = await mk({ options: { executorIssuerCode: '() => { throw new Error("bad code"); }' } })
        .customCourtsGenerateExecutiveDocumentNumber()
        .catch((e: any) => e);
      expect(e2.details).toBe('Error while evaluation executorIssuerCode function.');
      create.mockRestore();
      next.mockRestore();
    });

    it('transforms async function names', () => {
      const rm = mk({});
      expect(rm.transformFunctionToAsync('(d) => d')).toBe('(d) => d');
      expect(rm.transformFunctionToAsync('(d) => await plinkFromFilestoragePdf(d)')).toBe('(d) => await plinkFromFilestoragePdf(d)');
      expect(rm.transformFunctionToAsync('(d) => plinkFromFilestoragePdf(d)')).toBe('async (d) => await plinkFromFilestoragePdf(d)');
      expect(rm.transformFunctionToAsync('async (d) => [plinkFromFilestorageAttach(d), plinkFromFilestoragePdf(d)]')).toBe(
        'async (d) => [await plinkFromFilestorageAttach(d), await plinkFromFilestoragePdf(d)]',
      );
    });
  });
});

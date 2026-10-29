import nock from 'nock';

import { TestApp } from './test-app';
import { ExternalReader } from '../src/lib/external_reader';
import { sanitizeUserExtraParams } from '../src/controllers/external_reader';
import { seedScenario, addUnit, userRequest, SCENARIO } from './helpers/scenario';

const USER = SCENARIO.userId;

// ExternalReader against a nock'ed reader service (data, errors, attachments, captcha, cache) and the
// external reader controller routes with the reader replaced by a spy.
describe('External reader service', () => {
  let app: TestApp;
  let reader: any;
  let base: string;
  const as = (userId = USER, extra: any = {}) => userRequest(app, userId, extra);

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
    await addUnit(app, { id: 990091, name: 'Reader unit', heads: [USER], members: [USER], heads_ipn: [], members_ipn: [] });
    reader = new ExternalReader();
    base = reader.url || reader.urlTemplate.replace('/<service>/<method>', '');
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    nock.cleanAll();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('getData', () => {
    it('posts the filters and returns the response', async () => {
      let sent: any;
      nock(base)
        .post('/svc/mth', (body) => {
          sent = body;
          return true;
        })
        .reply(200, { data: { ok: true } });
      const result = await reader.getData('svc', 'mth', { c: 1 }, 'fake-token', { ipn: '1' }, { f: 2 }, { e: 3 }, 'mocks', 'x-token', 1000000);
      expect(result).toEqual({ data: { ok: true } });
      expect(sent).toEqual({ userFilter: { ipn: '1' }, nonUserFilter: { f: 2 }, extraParams: { e: 3 }, captchaPayload: { c: 1 } });
    });

    it('rethrows an HTTP error of the reader', async () => {
      nock(base)
        .post('/svc/mth')
        .reply(500, { error: { message: 'boom' } });
      await expect(reader.getData('svc', 'mth')).rejects.toBeTruthy();
    });

    it('reads captcha challenge, providers and mocks keys and deletes the cache', async () => {
      nock(base)
        .get('/captcha/svc/mth')
        .reply(200, { data: { challenge: 'c' } });
      expect(await reader.getCaptchaChallenge('svc', 'mth')).toEqual({ data: { challenge: 'c' } });
      nock(base)
        .get('/captcha/providers/list')
        .reply(200, { data: ['p'] });
      expect(await reader.getCaptchProviders()).toEqual({ data: ['p'] });
      nock(base).delete('/cache/1234567890').reply(200, { ok: 1 });
      expect(await reader.deleteCacheByUser('fake-token', { ipn: '1234567890' })).toEqual({ ok: 1 });
      jest.spyOn((global as any).httpClient, 'request').mockResolvedValue({ json: async () => ({ data: ['k'] }) } as any);
      expect(await reader.getMocksKeysByUser('fake-token', ['a', 'b'])).toEqual(['k']);
      expect(await reader.getMocksKeysByUser('fake-token')).toEqual(['k']);
    });
  });

  describe('getDataByUser', () => {
    const attachments = [{ name: 'a.pdf', data: Buffer.from('%PDF').toString('base64'), description: 'Desc' }];
    const call = (extra: any = {}, trusted = true) =>
      reader.getDataByUser(
        'svc',
        'mth',
        undefined,
        'fake-token',
        { ipn: '1', edrpou: '2', services: {} },
        { f: 1 },
        { documentId: 'doc-1', ...extra },
        { head: [], member: [] },
        undefined,
        undefined,
        undefined,
        trusted,
      );

    it('logs response data when it is enabled and cuts long responses', async () => {
      const getData = jest.spyOn(reader, 'getData').mockResolvedValue({ data: 'x'.repeat(100000) } as any);
      const config = (global as any).config;
      config.external_reader.logResponses = true;
      await call();
      getData.mockResolvedValue('y'.repeat(100000) as any);
      await expect(call()).resolves.toBeTruthy();
      getData.mockResolvedValue({ data: { short: true } } as any);
      await call();
      const circular: any = {};
      circular.self = circular;
      getData.mockResolvedValue(circular);
      await call();
      config.external_reader.logResponses = false;
      getData.mockResolvedValue(circular);
      await call();
      getData.mockResolvedValue('text' as any);
      await call();
    });

    it('saves attachments of the response once and masks their content', async () => {
      jest.spyOn(reader, 'getData').mockImplementation(async () => ({ data: { attachments: JSON.parse(JSON.stringify(attachments)) } }) as any);
      jest
        .spyOn(reader.storageService.provider, 'uploadFileFromStream')
        .mockResolvedValue({ id: 'file-1', name: 'a.pdf', contentType: 'application/pdf', contentLength: 4 } as any);
      const create = jest.spyOn(reader.documentAttachmentModel, 'create').mockResolvedValue({} as any);
      const result = await call({ isSaveAttachments: true, prepareAttachments: '({ attachments }) => attachments' });
      expect(result.data.attachments[0].data).toBe('****');
      expect(create).toHaveBeenCalledTimes(1);
      await call({ isSaveAttachments: true });
      await call({ isSaveAttachments: true }, false);
      expect(create).toHaveBeenCalledTimes(2);
    });

    it('removes old attachments before saving new ones', async () => {
      jest.spyOn(reader, 'getData').mockImplementation(async () => ({ data: { attachments: JSON.parse(JSON.stringify(attachments)) } }) as any);
      jest.spyOn(reader.storageService.provider, 'uploadFileFromStream').mockResolvedValue({ id: 'file-1', name: 'a.pdf' } as any);
      jest.spyOn(reader.documentAttachmentModel, 'create').mockResolvedValue({} as any);
      const deleteAll = jest.spyOn(reader.documentAttachmentModel, 'deleteByDocumentId').mockResolvedValue(undefined as any);
      await call({ isSaveAttachments: true, deleteOldAttachmentsBeforeSave: true });
      expect(deleteAll).toHaveBeenCalledWith('doc-1');
      deleteAll.mockRejectedValueOnce(new Error('db down'));
      await expect(call({ isSaveAttachments: true, deleteOldAttachmentsBeforeSave: true })).rejects.toThrow('Cannot delete old attachments');

      const old = jest.spyOn(reader.documentAttachmentModel, 'getByDocumentIdAndMeta').mockResolvedValue([{ id: 'o1', link: 'old-link' }] as any);
      const deleteFile = jest.spyOn(reader.storageService.provider, 'deleteFile').mockRejectedValueOnce(new Error('storage down'));
      const deleteRow = jest.spyOn(reader.documentAttachmentModel, 'delete').mockResolvedValue(true as any);
      await call({ isSaveAttachments: true, isRewriteAttachmentsOnEachRequest: true });
      expect(deleteFile).toHaveBeenCalledWith('old-link');
      expect(deleteRow).toHaveBeenCalledWith('o1');
      old.mockRejectedValueOnce(new Error('db down'));
      await expect(call({ isSaveAttachments: true, isRewriteAttachmentsOnEachRequest: true })).rejects.toThrow('Cannot get old attachments');
      deleteRow.mockRejectedValueOnce(new Error('db down'));
      await expect(call({ isSaveAttachments: true, isRewriteAttachmentsOnEachRequest: true })).rejects.toThrow('Cannot delete old attachments');
    });

    it('wraps upload and database failures of attachments', async () => {
      jest.spyOn(reader, 'getData').mockImplementation(async () => ({ data: { attachments: JSON.parse(JSON.stringify(attachments)) } }) as any);
      const upload = jest.spyOn(reader.storageService.provider, 'uploadFileFromStream').mockRejectedValueOnce(new Error('storage down'));
      await expect(call({ isSaveAttachments: true })).rejects.toThrow('Cannot upload attachment');
      upload.mockResolvedValue({ id: 'file-1', name: 'a.pdf' } as any);
      jest.spyOn(reader.documentAttachmentModel, 'create').mockRejectedValueOnce(new Error('db down'));
      await expect(call({ isSaveAttachments: true })).rejects.toThrow('Cannot insert attachment');
    });
  });

  describe('controller', () => {
    it('sanitizes the extra params of the user', () => {
      expect(sanitizeUserExtraParams(undefined)).toEqual({});
      const result = sanitizeUserExtraParams({ documentId: 'd', isSaveAttachments: true, __proto__: 'x', keep: 1, url: '/relative/path' });
      expect(result).toEqual({ keep: 1, url: '/relative/path' });
      for (const url of ['https://evil.example', '//evil.example', '/a/../b', '/a\\b', '/a@b', 5, '%']) {
        expect(sanitizeUserExtraParams({ url })).toEqual({});
      }
    });

    it('returns reader data with and without pagination and validates names', async () => {
      const spy = jest.spyOn(new ExternalReader(), 'getDataByUser').mockResolvedValue({ data: { rows: [1] } } as any);
      const ok = await as()('post', '/external_reader').send({
        service: 'svc',
        method: 'mth',
        filters: { a: 1 },
        extraParams: { documentId: 'd', ok: 1 },
      });
      expect(ok.status).toBe(200);
      expect(ok.body.data).toEqual({ rows: [1] });
      expect((spy.mock.calls[0][6] as any).documentId).toBeUndefined();
      spy.mockResolvedValueOnce({ data: [1], meta: { total: 1 } } as any);
      const paged = await as()('post', '/external_reader').send({ service: 'svc', method: 'mth', filters: {} });
      expect(paged.status).toBe(200);
      expect((await as()('post', '/external_reader').send({ service: 'a/b', method: 'mth', filters: {} })).status).toBeGreaterThanOrEqual(400);
      spy.mockRejectedValueOnce(new Error('Authentication error: no'));
      expect((await as()('post', '/external_reader').send({ service: 'svc', method: 'mth', filters: {} })).status).toBe(401);
      spy.mockRejectedValueOnce(new Error('boom'));
      expect((await as()('post', '/external_reader').send({ service: 'svc', method: 'mth', filters: {} })).status).toBe(500);
      const config = (global as any).config;
      config.external_reader.strictThroughDocumentAccess = ['svc.strict'];
      expect((await as()('post', '/external_reader').send({ service: 'svc', method: 'strict', filters: {} })).status).toBe(400);
      config.external_reader.strictThroughDocumentAccess = undefined;
    });

    it('answers the captcha challenge', async () => {
      const captcha = jest.spyOn(new ExternalReader(), 'getCaptchaChallenge').mockResolvedValue({ data: { challenge: { enabled: true } } } as any);
      const ok = await as()('get', '/external_reader/captcha/svc/mth');
      expect(ok.status).toBe(200);
      captcha.mockResolvedValueOnce({ data: {} } as any);
      expect((await as()('get', '/external_reader/captcha/svc/mth')).status).toBe(200);
      captcha.mockRejectedValueOnce(new Error('down'));
      expect((await as()('get', '/external_reader/captcha/svc/mth')).status).toBeGreaterThanOrEqual(400);
    });
  });
});

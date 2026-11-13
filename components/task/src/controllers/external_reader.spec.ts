import { ExternalReaderController, sanitizeUserExtraParams } from './external_reader';
import { resetAppContext, setAppContext } from '../lib/context';

jest.mock('../lib/external_reader', () => ({
  ExternalReader: jest.fn().mockImplementation(() => ({ getDataByUser: jest.fn() })),
}));

describe('sanitizeUserExtraParams', () => {
  afterEach(() => resetAppContext());

  it('drops attachment saving and sandbox keys, keeps other values', () => {
    const result = sanitizeUserExtraParams({
      isSaveAttachments: true,
      documentId: 'victim-doc',
      deleteOldAttachmentsBeforeSave: true,
      isRewriteAttachmentsOnEachRequest: true,
      prepareAttachments: '(a) => a',
      data: { q: 1 },
      params: { page: 2 },
      requestTimeout: 1000,
    });

    expect(result).toEqual({ data: { q: 1 }, params: { page: 2 }, requestTimeout: 1000 });
  });

  it.each([undefined, null, 'str', 5, true, ['a'], []])('returns an empty object for %p', (value) => {
    expect(sanitizeUserExtraParams(value)).toEqual({});
  });

  it('keeps a relative url and drops absolute or unsafe urls', () => {
    expect(sanitizeUserExtraParams({ url: '/api/items?x=1' })).toEqual({ url: '/api/items?x=1' });
    for (const url of [
      'http://evil.example/x',
      '//evil.example',
      'file:///etc/passwd',
      '/a/../b',
      '/a/%2e%2e/b',
      'a\\b',
      'user@evil',
      '/a%zz',
      5,
      {},
    ]) {
      expect(sanitizeUserExtraParams({ url })).toEqual({});
    }
  });

  it('does not copy prototype keys and does not mutate the input', () => {
    const input = JSON.parse('{"__proto__":{"polluted":true},"constructor":1,"a":1,"documentId":"x"}');
    const result = sanitizeUserExtraParams(input);

    expect(result).toEqual({ a: 1 });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(({} as any).polluted).toBeUndefined();
    expect(input.documentId).toBe('x');
  });
});

describe('ExternalReaderController extraParams handling', () => {
  const buildReq = (body) => ({
    body,
    headers: {},
    get: jest.fn(),
  });
  let controller: any;
  let getDataByUser: jest.Mock;

  beforeEach(() => {
    (ExternalReaderController as any).singleton = undefined;
    setAppContext({ config: { external_reader: {} } });
    setAppContext({ log: { save: jest.fn() } as any });
    controller = new ExternalReaderController({ external_reader: {} });
    getDataByUser = controller.externalReader.getDataByUser;
    getDataByUser.mockResolvedValue({ data: { ok: true } });
    controller.getRequestUserAccessToken = jest.fn().mockReturnValue('token');
    controller.getRequestUserInfo = jest.fn().mockReturnValue({ ipn: '1' });
    controller.getRequestUserUnitIds = jest.fn().mockReturnValue({ head: [], member: [] });
    controller.responseData = jest.fn();
    controller.responseError = jest.fn();
  });

  const dangerous = {
    isSaveAttachments: true,
    documentId: 'victim',
    deleteOldAttachmentsBeforeSave: true,
    prepareAttachments: '(a)=>a',
    data: { q: 1 },
  };

  it('getData forwards only sanitized extraParams', async () => {
    await controller.getData(buildReq({ service: 's', method: 'm', filters: {}, extraParams: dangerous }), {});

    expect(getDataByUser).toHaveBeenCalledTimes(1);
    expect(getDataByUser.mock.calls[0][6]).toEqual({ data: { q: 1 } });
    // No trusted flag from the user route.
    expect(getDataByUser.mock.calls[0]).toHaveLength(9);
  });

  it('getDataAsync forwards only sanitized extraParams', async () => {
    setAppContext({ redisClient: { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) } });
    controller.config = { external_reader: {} };

    await controller.getDataAsync(buildReq({ service: 's', method: 'm', filters: {}, extraParams: dangerous }), {});
    await new Promise((resolve) => setImmediate(resolve));

    expect(getDataByUser).toHaveBeenCalledTimes(1);
    expect(getDataByUser.mock.calls[0][6]).toEqual({ data: { q: 1 } });
    expect(getDataByUser.mock.calls[0]).toHaveLength(11);
  });
});

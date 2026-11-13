import RecordsController from './records';
import RecordEntity from '../entities/record';

jest.mock('express-validator', () => ({
  matchedData: (req, options) => Object.assign({}, ...options.locations.map((location) => req[location] || {})),
}));

const setup = () => {
  const record = new RecordEntity({
    id: 'id',
    key_id: 1,
    allow_tokens: [],
    data: { public: 'target', secret: 'private', internal: 'hidden' },
  } as any);
  const key = {
    id: 1,
    accessMode: 'full',
    isEncrypted: false,
    schema: {
      properties: { secret: { allowTokens: ['private'] } },
      responseFields: ['public', 'secret'],
    },
  };
  const controller: any = Object.create(RecordsController.prototype);
  Object.assign(controller, {
    config: { auth: { trustedCallers: ['task'] }, search: { main: { resultsCount: 10 } } },
    log: { save: jest.fn() },
    controllerMetric: jest.fn(),
    responseData: jest.fn(),
    responseError: jest.fn(),
    keyModel: {
      findById: jest.fn().mockResolvedValue({ data: key }),
      checkRecordsReadable: jest.fn((value) => value.accessMode !== 'write_only'),
    },
    recordModel: { search: jest.fn().mockResolvedValue({ data: [record], meta: { count: 1 } }) },
    searchBusiness: { getTextList: jest.fn().mockReturnValue(['target']) },
    checkValidationIdentity: jest.fn(),
    accessLogBusiness: { saveIfNeedIt: jest.fn() },
  });
  const req: any = {
    query: { key_id: 1, text: 'target', search_key: 'public' },
    auth: { user: 'reader' },
  };
  return { controller, record, key, req };
};

describe('RG-07: search authorization', () => {
  it('uses a per-key public default when the caller omits search_key', async () => {
    const { controller, req } = setup();
    delete req.query.search_key;
    controller.config.search[1] = { defaultSearchKey: 'public' };
    await controller.search(req, {});
    expect(controller.recordModel.search).toHaveBeenCalledWith(1, 'data.public', ['target'], 10, 0, []);
    expect(controller.responseError).not.toHaveBeenCalled();
  });
  it('does not apply a global or another key default to a protected index', async () => {
    const { controller, req } = setup();
    delete req.query.search_key;
    controller.config.search.main.defaultSearchKey = 'public';
    controller.config.search[2] = { defaultSearchKey: 'public' };
    await controller.search(req, {});
    expect(controller.responseError.mock.calls[0][2]).toBe(403);
    expect(controller.recordModel.search).not.toHaveBeenCalled();
  });
  it('uses server tokens and projects every result after original-data signature validation', async () => {
    const { controller, record, req } = setup();
    controller.config.auth.userAllowTokens = { reader: ['private'] };
    record.allowTokens = ['private'];
    controller.checkValidationIdentity.mockImplementation(async (_method, _key, [original]) => {
      expect(original.data.internal).toBe('hidden');
    });
    await controller.search(req, {});
    expect(controller.recordModel.search).toHaveBeenCalledWith(1, 'data.public', ['target'], 10, 0, ['private']);
    expect(record.data).toEqual({ public: 'target', secret: 'private' });
    expect(controller.responseData).toHaveBeenCalled();
  });
  it('does not use query flags, query tokens, actor info or another service grant', async () => {
    const { controller, record, req } = setup();
    req.query = {
      ...req.query,
      allow_tokens: ['private'],
      allow_see_all_records: true,
      disable_fields_rules: true,
    };
    req.accessInfo = { user: 'admin', allowTokens: ['private'] };
    controller.config.auth.userAllowTokens = { admin: ['private'] };
    await controller.search(req, {});
    expect(record.data).toEqual({ public: 'target' });
    expect(controller.recordModel.search.mock.calls[0][5]).toEqual([]);
  });
  it.each(['missing', 'write-only', 'limited', 'hidden-field', 'derived-string'])('denies %s before querying records', async (failure) => {
    const { controller, key, req } = setup();
    if (failure === 'missing') controller.keyModel.findById.mockResolvedValue(undefined);
    if (failure === 'write-only') key.accessMode = 'write_only';
    if (failure === 'limited') req.auth.userLimitedAccessKeys = ['2'];
    if (failure === 'hidden-field') req.query.search_key = 'secret';
    if (failure === 'derived-string') delete req.query.search_key;
    await controller.search(req, {});
    expect(controller.responseError.mock.calls[0][2]).toBe(403);
    expect(controller.recordModel.search).not.toHaveBeenCalled();
  });
  it('retains the encrypted-key rejection', async () => {
    const { controller, key, req } = setup();
    key.isEncrypted = true;
    await controller.search(req, {});
    expect(controller.responseError.mock.calls[0][2]).toBe(400);
    expect(controller.recordModel.search).not.toHaveBeenCalled();
  });
  it.each(['key', 'query', 'projection', 'signature', 'server-tokens', 'row-tokens', 'wrong-key', 'ciphertext'])(
    'returns no data/audit on %s failure',
    async (failure) => {
      const { controller, record, req } = setup();
      if (failure === 'key') controller.keyModel.findById.mockRejectedValue(new Error('failed'));
      if (failure === 'query') controller.recordModel.search.mockRejectedValue(new Error('failed'));
      if (failure === 'projection')
        record.applyResponseFieldsRules = () => {
          throw new Error('failed');
        };
      if (failure === 'signature') controller.checkValidationIdentity.mockRejectedValue(new Error('failed'));
      if (failure === 'server-tokens') controller.config.auth.userAllowTokens = { reader: 'private' };
      if (failure === 'row-tokens') record.allowTokens = [null];
      if (failure === 'wrong-key') record.keyId = 2;
      if (failure === 'ciphertext') record.isEncrypted = true;
      await controller.search(req, {});
      expect(controller.responseError.mock.calls[0][2]).toBe(500);
      expect(controller.responseData).not.toHaveBeenCalled();
      expect(controller.accessLogBusiness.saveIfNeedIt).not.toHaveBeenCalled();
    },
  );
  it('keeps trusted callers unrestricted (no token filter, no projection, derived search string)', async () => {
    const { controller, record, req } = setup();
    req.auth.user = 'task';
    delete req.query.search_key;
    record.allowTokens = ['private'];
    await controller.search(req, {});
    expect(controller.recordModel.search).toHaveBeenCalledWith(1, 'search_string', ['target'], 10, 0, undefined);
    expect(record.data).toEqual({ public: 'target', secret: 'private', internal: 'hidden' });
    expect(controller.responseError).not.toHaveBeenCalled();
  });
});

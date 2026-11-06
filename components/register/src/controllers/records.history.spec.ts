import RecordsController from './records';
import KeysController from './keys';

jest.mock('express-validator', () => ({
  matchedData: (req, options) => Object.assign({}, ...options.locations.map((location) => req[location] || {})),
}));

const snapshot = (overrides: any = {}) => ({
  id: 'h1',
  recordId: 'rec',
  keyId: 1,
  operation: 'update',
  data: {
    id: 'rec',
    key_id: 1,
    allow_tokens: [],
    is_encrypted: false,
    search_string: 'one-secret',
    signature: 'sig',
    data: { public: 'visible', secret: 'private', internal: 'hidden' },
  } as any,
  ...overrides,
});

const key = () => ({
  id: 1,
  accessMode: 'full',
  isEncrypted: false,
  schema: { properties: { secret: { allowTokens: ['private'] } }, responseFields: ['public', 'secret'] },
});

const common = (keyValue) => ({
  log: { save: jest.fn() },
  controllerMetric: jest.fn(),
  responseData: jest.fn(),
  responseError: jest.fn(),
  keyModel: {
    findById: jest.fn(async () => ({ data: keyValue })),
    checkRecordsReadable: jest.fn((value) => value.accessMode !== 'write_only'),
    checkRecordsReadableById: jest.fn(async () => keyValue.accessMode !== 'write_only'),
  },
});

const setupRecords = (config: any = { auth: { trustedCallers: ['task'] } }) => {
  const keyValue = key();
  const history = [snapshot()];
  const controller: any = Object.create(RecordsController.prototype);
  Object.assign(controller, common(keyValue), {
    config,
    historyModel: { getByRecordId: jest.fn().mockResolvedValue({ data: history, meta: { count: 1 } }) },
    historyBusiness: { splitByFields: jest.fn((list) => list) },
  });
  const req: any = { params: { id: 'rec' }, query: {}, auth: { user: 'reader' } };
  return { controller, keyValue, history, req };
};

const setupKeys = (config: any = { auth: { trustedCallers: ['task'] } }) => {
  const keyValue = key();
  const history = [snapshot()];
  const controller: any = Object.create(KeysController.prototype);
  Object.assign(controller, common(keyValue), {
    config,
    historyModel: { getByKeyId: jest.fn().mockResolvedValue({ data: history, meta: { count: 1 } }) },
  });
  const req: any = { params: { id: 1 }, query: {}, auth: { user: 'reader' } };
  return { controller, keyValue, history, req };
};

describe('RG-09: GET /records/:id/history', () => {
  it('hides columns and fields of every snapshot for an untrusted caller', async () => {
    const { controller, history, req } = setupRecords();
    await controller.findHistoryByRecordId(req, {});
    expect(controller.responseError).not.toHaveBeenCalled();
    const [, returned] = controller.responseData.mock.calls[0];
    expect(returned).toHaveLength(1);
    expect(returned[0].data.data).toEqual({ public: 'visible' });
    expect(returned[0].data).not.toHaveProperty('search_string');
    expect(returned[0].data).not.toHaveProperty('signature');
    expect(history[0].data.data).not.toHaveProperty('internal');
  });

  it('shows protected columns only with server-side userAllowTokens', async () => {
    const { controller, req } = setupRecords({ auth: { trustedCallers: ['task'], userAllowTokens: { reader: ['private'] } } });
    await controller.findHistoryByRecordId(req, {});
    expect(controller.responseData.mock.calls[0][1][0].data.data).toEqual({ public: 'visible', secret: 'private' });
  });

  it('ignores client-supplied allow_tokens', async () => {
    const { controller, req } = setupRecords();
    req.query = { allow_tokens: ['private'] };
    await controller.findHistoryByRecordId(req, {});
    expect(controller.responseData.mock.calls[0][1][0].data.data).toEqual({ public: 'visible' });
  });

  it('keeps the full snapshot for a trusted caller', async () => {
    const { controller, req } = setupRecords();
    req.auth.user = 'task';
    await controller.findHistoryByRecordId(req, {});
    const returned = controller.responseData.mock.calls[0][1][0];
    expect(returned.data.data).toEqual({ public: 'visible', secret: 'private', internal: 'hidden' });
    expect(returned.data.search_string).toBe('one-secret');
  });

  it.each(['write-only', 'missing-key', 'limited-key'])('rejects %s without data', async (failure) => {
    const { controller, keyValue, req } = setupRecords();
    if (failure === 'write-only') keyValue.accessMode = 'write_only';
    if (failure === 'missing-key') controller.keyModel.findById.mockResolvedValue(undefined);
    if (failure === 'limited-key') req.auth.userLimitedAccessKeys = ['3'];
    await controller.findHistoryByRecordId(req, {});
    expect(controller.responseError.mock.calls[0][2]).toBe(403);
    expect(controller.responseData).not.toHaveBeenCalled();
  });

  it('drops snapshots of rows with foreign tokens and malformed rows', async () => {
    const { controller, history, req } = setupRecords();
    history.push(snapshot({ id: 'h2', data: { ...history[0].data, allow_tokens: ['secret-token'] } }));
    history.push(snapshot({ id: 'h3', data: { ...history[0].data, allow_tokens: null } }));
    await controller.findHistoryByRecordId(req, {});
    expect(controller.responseData.mock.calls[0][1].map((h) => h.id)).toEqual(['h1']);
  });

  it('never returns encrypted snapshots as data', async () => {
    const { controller, history, req } = setupRecords();
    history[0].data.is_encrypted = true;
    history[0].data.data = { $encrypted: 'ciphertext' };
    await controller.findHistoryByRecordId(req, {});
    expect(controller.responseData.mock.calls[0][1][0].data.data).toEqual({});
  });

  it('applies the projection before splitting by fields', async () => {
    const { controller, req } = setupRecords();
    req.query = { split_by_fields: true };
    await controller.findHistoryByRecordId(req, {});
    expect(controller.historyBusiness.splitByFields.mock.calls[0][0][0].data.data).toEqual({ public: 'visible' });
  });

  it('fails closed on a malformed responseFields rule', async () => {
    const { controller, keyValue, req } = setupRecords();
    (keyValue.schema as any).responseFields = [1];
    await controller.findHistoryByRecordId(req, {});
    expect(controller.responseError.mock.calls[0][2]).toBe(500);
    expect(controller.responseData).not.toHaveBeenCalled();
  });
});

describe('RG-09: GET /keys/:id/history', () => {
  it('projects snapshots for an untrusted caller', async () => {
    const { controller, req } = setupKeys();
    await controller.findHistoryByKeyId(req, {});
    const returned = controller.responseData.mock.calls[0][1];
    expect(returned[0].data.data).toEqual({ public: 'visible' });
    expect(returned[0].data).not.toHaveProperty('search_string');
  });

  it('keeps the full snapshot for a trusted caller', async () => {
    const { controller, req } = setupKeys();
    req.auth.user = 'task';
    await controller.findHistoryByKeyId(req, {});
    expect(controller.responseData.mock.calls[0][1][0].data.data).toEqual({ public: 'visible', secret: 'private', internal: 'hidden' });
  });

  it('rejects an unreadable key', async () => {
    const { controller, keyValue, req } = setupKeys();
    keyValue.accessMode = 'write_only';
    await controller.findHistoryByKeyId(req, {});
    expect(controller.responseError.mock.calls[0][2]).toBe(403);
    expect(controller.historyModel.getByKeyId).not.toHaveBeenCalled();
  });

  it.each([
    ['hidden column', { secret: 'p' }],
    ['field outside responseFields', { internal: 'h' }],
    ['nested hidden column', { 'secret.deep': 'p' }],
    ['malformed path', { '__proto__.x': 'p' }],
    ['malformed json', '{bad'],
  ])('rejects record_data_like on %s for an untrusted caller', async (_name, like) => {
    const { controller, req } = setupKeys();
    req.query = { record_data_like: like };
    await controller.findHistoryByKeyId(req, {});
    expect(controller.responseError.mock.calls[0][2]).toBe(403);
    expect(controller.historyModel.getByKeyId).not.toHaveBeenCalled();
  });

  it('allows record_data_like on a readable field and lets trusted callers search anything', async () => {
    const { controller, req } = setupKeys();
    req.query = { record_data_like: { public: 'vis' } };
    await controller.findHistoryByKeyId(req, {});
    expect(controller.historyModel.getByKeyId).toHaveBeenCalled();
    expect(controller.responseError).not.toHaveBeenCalled();

    const trusted = setupKeys();
    trusted.req.auth.user = 'task';
    trusted.req.query = { record_data_like: { internal: 'h' } };
    await trusted.controller.findHistoryByKeyId(trusted.req, {});
    expect(trusted.controller.responseError).not.toHaveBeenCalled();
  });
});

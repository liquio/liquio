import RecordsController from './records';
import RecordEntity from '../entities/record';

jest.mock('express-validator', () => ({
  matchedData: (req, options) => Object.assign({}, ...options.locations.map((location) => req[location] || {})),
}));

const setup = () => {
  const record = new RecordEntity({
    id: 'record-id',
    key_id: 2,
    allow_tokens: [],
    data: { public: 'visible', secret: 'private', internal: 'hidden' },
  } as any);
  const key = {
    id: 2,
    accessMode: 'full',
    schema: {
      properties: { secret: { allowTokens: ['private'] } },
      responseFields: ['public', 'secret'],
    },
  };
  const controller: any = Object.create(RecordsController.prototype);
  Object.assign(controller, {
    config: { auth: { trustedCallers: ['task'] } },
    log: { save: jest.fn() },
    controllerMetric: jest.fn(),
    responseData: jest.fn(),
    responseError: jest.fn(),
    recordModel: { findById: jest.fn().mockResolvedValue({ data: record }) },
    keyModel: {
      findById: jest.fn().mockResolvedValue({ data: key }),
      checkRecordsReadable: jest.fn((value) => value.accessMode !== 'write_only'),
    },
    accessLogBusiness: { saveIfNeedIt: jest.fn() },
    checkValidationIdentity: jest.fn(),
  });
  const req: any = { params: { id: record.id }, query: {}, auth: { user: 'reader' } };
  return { controller, record, key, req };
};

describe('RG-02: UUID read authorization', () => {
  it('always applies key and field rules without query tokens', async () => {
    const { controller, record, req } = setup();
    await controller.findById(req, {});
    expect(controller.keyModel.findById).toHaveBeenCalledWith(2);
    expect(record.data).toEqual({ public: 'visible' });
    expect(controller.responseData).toHaveBeenCalledWith({}, record);
  });
  it.each(['write-only', 'missing-key', 'no-key-id', 'limited-key', 'protected-row', 'malformed-row'])(
    'rejects %s without data or access logging',
    async (failure) => {
      const { controller, record, key, req } = setup();
      if (failure === 'write-only') key.accessMode = 'write_only';
      if (failure === 'missing-key') controller.keyModel.findById.mockResolvedValue(undefined);
      if (failure === 'no-key-id') record.keyId = undefined;
      if (failure === 'limited-key') req.auth.userLimitedAccessKeys = ['3'];
      if (failure === 'protected-row') record.allowTokens = ['private'];
      if (failure === 'malformed-row') record.allowTokens = null;
      await controller.findById(req, {});
      expect(controller.responseError.mock.calls[0][2]).toBe(403);
      expect(controller.responseData).not.toHaveBeenCalled();
      expect(controller.accessLogBusiness.saveIfNeedIt).not.toHaveBeenCalled();
      expect(controller.checkValidationIdentity).not.toHaveBeenCalled();
    },
  );
  it('uses only configured tokens of the authenticated service', async () => {
    const { controller, record, req } = setup();
    record.allowTokens = ['private'];
    controller.config.auth.userAllowTokens = { reader: ['private'], other: ['unrelated'] };
    await controller.findById(req, {});
    expect(record.data).toEqual({ public: 'visible', secret: 'private' });
    expect(controller.responseError).not.toHaveBeenCalled();
  });
  it('does not grant tokens through query flags, paths or actor information', async () => {
    const { controller, record, req } = setup();
    req.query = {
      allow_tokens: ['private'],
      allow_see_all_records: true,
      disable_fields_rules: true,
    };
    req.accessInfo = { user: 'privileged', allowTokens: ['private'] };
    controller.config.auth.userAllowTokens = { privileged: ['private'] };
    await controller.findById(req, {});
    expect(record.data).toEqual({ public: 'visible' });
  });
  it.each(['key-error', 'column-error', 'response-error', 'invalid-tokens'])('fails closed on %s', async (failure) => {
    const { controller, key, req } = setup();
    if (failure === 'key-error') controller.keyModel.findById.mockRejectedValue(new Error('failed'));
    if (failure === 'column-error') key.schema.properties.secret.allowTokens = 'private' as any;
    if (failure === 'response-error') key.schema.responseFields = 'public' as any;
    if (failure === 'invalid-tokens') controller.config.auth.userAllowTokens = { reader: 'private' };
    await controller.findById(req, {});
    expect(controller.responseError.mock.calls[0][2]).toBe(500);
    expect(controller.responseData).not.toHaveBeenCalled();
    expect(controller.accessLogBusiness.saveIfNeedIt).not.toHaveBeenCalled();
  });
  it('preserves 404 for a missing UUID', async () => {
    const { controller, req } = setup();
    controller.recordModel.findById.mockResolvedValue(undefined);
    await controller.findById(req, {});
    expect(controller.responseError).toHaveBeenCalledWith({}, 'Not found.', 404);
    expect(controller.keyModel.findById).not.toHaveBeenCalled();
  });
  it('verifies signed data before applying field and path projection', async () => {
    const { controller, record, req } = setup();
    req.query.paths = ['public'];
    controller.checkValidationIdentity.mockImplementation(async (_method, _key, [original]) => {
      expect(original.data).toEqual({ public: 'visible', secret: 'private', internal: 'hidden' });
    });
    await controller.findById(req, {});
    expect(controller.checkValidationIdentity).toHaveBeenCalled();
    expect(record.data).toEqual({ public: 'visible' });
    expect(controller.responseError).not.toHaveBeenCalled();
  });
  it('does not return data or log a successful view when signature verification fails', async () => {
    const { controller, req } = setup();
    controller.checkValidationIdentity.mockRejectedValue(new Error('Invalid signature.'));
    await controller.findById(req, {});
    expect(controller.responseError).toHaveBeenCalledWith({}, 'Invalid signature.', 500);
    expect(controller.responseData).not.toHaveBeenCalled();
    expect(controller.accessLogBusiness.saveIfNeedIt).not.toHaveBeenCalled();
  });
  it('keeps trusted callers unrestricted (write_only key, foreign row tokens, full data)', async () => {
    const { controller, record, key, req } = setup();
    req.auth.user = 'task';
    key.accessMode = 'write_only';
    record.allowTokens = ['private'];
    await controller.findById(req, {});
    expect(record.data).toEqual({ public: 'visible', secret: 'private', internal: 'hidden' });
    expect(controller.responseData).toHaveBeenCalledWith({}, record);
    expect(controller.responseError).not.toHaveBeenCalled();
  });
  it('hides columns in PATCH/PUT responses for untrusted callers only', async () => {
    const { controller, record, req } = setup();
    await controller['projectWriteResponse'](req, record);
    expect(record.data).toEqual({ public: 'visible' });
    const trusted = setup();
    trusted.req.auth.user = 'task';
    await trusted.controller['projectWriteResponse'](trusted.req, trusted.record);
    expect(trusted.record.data).toEqual({ public: 'visible', secret: 'private', internal: 'hidden' });
  });
  it('fails closed when the write-response key cannot be loaded', async () => {
    const { controller, record, req } = setup();
    controller.keyModel.findById.mockResolvedValue(undefined);
    await expect(controller['projectWriteResponse'](req, record)).rejects.toThrow();
  });
});

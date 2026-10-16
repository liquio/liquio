import RecordsController from './records';
import RecordEntity from '../entities/record';

jest.mock('express-validator', () => ({
  matchedData: (req, options) => Object.assign({}, ...options.locations.map((location) => req[location] || {})),
}));

jest.mock('../lib/json_schema', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ check: jest.fn().mockResolvedValue([]) })),
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

  describe('write routes', () => {
    const body = { keyId: 2, registerId: 1, data: { public: 'visible', secret: 'private', internal: 'hidden' } };
    const setupCreate = () => {
      const ctx = setup();
      Object.assign(ctx.controller, {
        sandbox: { evalWithArgs: jest.fn().mockReturnValue('s') },
        checkXss: jest.fn(),
        recordModel: { create: jest.fn().mockResolvedValue({ data: ctx.record }) },
      });
      Object.assign(ctx.key, { schema: { ...ctx.key.schema } });
      ctx.controller.keyModel.checkRecordsWritable = jest.fn().mockReturnValue(true);
      ctx.req.body = body;
      return ctx;
    };
    it('projects the POST /records response for an untrusted caller', async () => {
      const { controller, record, req } = setupCreate();
      await controller.create(req, {});
      expect(record.data).toEqual({ public: 'visible' });
      expect(controller.responseData).toHaveBeenCalledWith({}, record);
    });
    it('keeps the full POST /records response for a trusted caller', async () => {
      const { controller, record, req } = setupCreate();
      req.auth.user = 'task';
      await controller.create(req, {});
      expect(record.data).toEqual({ public: 'visible', secret: 'private', internal: 'hidden' });
    });
    it('fails closed on POST /records when the response cannot be projected', async () => {
      const { controller, key, req } = setupCreate();
      key.schema.responseFields = 'public' as any;
      await controller.create(req, {});
      expect(controller.responseError.mock.calls[0][2]).toBe(500);
      expect(controller.responseData).not.toHaveBeenCalled();
    });

    describe('PATCH /records/:id token enforcement (auth.strict)', () => {
      const setupPatch = (strict?: boolean) => {
        const ctx = setup();
        Object.assign(ctx.controller, {
          recordModel: { updatePatch: jest.fn().mockResolvedValue(ctx.record) },
        });
        ctx.controller.keyModel.checkRecordsWritableById = jest.fn().mockResolvedValue(true);
        ctx.controller.config.auth.strict = strict;
        ctx.req.params = { id: ctx.record.id };
        ctx.req.body = { keyId: 2, properties: [] };
        return ctx;
      };
      it('does not restrict by tokens when strict is off', async () => {
        const { controller, req } = setupPatch();
        await controller.updatePatch(req, {});
        expect(controller.recordModel.updatePatch).toHaveBeenCalledWith('record-id', 2, [], undefined);
        expect(controller.responseData).toHaveBeenCalled();
      });
      it('passes the server tokens of an untrusted caller when strict is on', async () => {
        const { controller, req } = setupPatch(true);
        controller.config.auth.userAllowTokens = { reader: ['private'] };
        await controller.updatePatch(req, {});
        expect(controller.recordModel.updatePatch).toHaveBeenCalledWith('record-id', 2, [], ['private']);
      });
      it('returns 403 without data for a foreign or missing row when strict is on', async () => {
        const { controller, req } = setupPatch(true);
        controller.recordModel.updatePatch.mockResolvedValue(undefined);
        await controller.updatePatch(req, {});
        expect(controller.responseError.mock.calls[0][2]).toBe(403);
        expect(controller.responseData).not.toHaveBeenCalled();
      });
      it('does not restrict trusted callers when strict is on', async () => {
        const { controller, req } = setupPatch(true);
        req.auth.user = 'task';
        await controller.updatePatch(req, {});
        expect(controller.recordModel.updatePatch).toHaveBeenCalledWith('record-id', 2, [], undefined);
      });
      it('responds 500 instead of hanging when the response cannot be projected', async () => {
        const { controller, key, req } = setupPatch();
        key.schema.responseFields = 'public' as any;
        await controller.updatePatch(req, {});
        expect(controller.responseError.mock.calls[0][2]).toBe(500);
        expect(controller.responseData).not.toHaveBeenCalled();
      });
    });
  });
});

describe('RG-02c: PUT/bulk-import token enforcement (auth.strict)', () => {
  beforeAll(() => {
    (global as any).typeOf = (value) => typeof value;
  });
  afterAll(() => {
    delete (global as any).typeOf;
  });

  const setupWrite = (strict?: boolean) => {
    const ctx = setup();
    Object.assign(ctx.controller, {
      sandbox: { evalWithArgs: jest.fn().mockReturnValue('s') },
      checkXss: jest.fn(),
      registerModel: { findById: jest.fn().mockResolvedValue({ data: { id: 1 } }) },
      recordModel: {
        update: jest.fn().mockResolvedValue({ data: ctx.record }),
        updateByDataField: jest.fn().mockResolvedValue({ data: ctx.record }),
        isWritableById: jest.fn().mockResolvedValue(true),
        findById: jest.fn().mockResolvedValue({ data: ctx.record }),
      },
    });
    ctx.controller.keyModel.checkRecordsWritable = jest.fn().mockReturnValue(true);
    ctx.controller.config.auth.strict = strict;
    ctx.controller.config.auth.userAllowTokens = { reader: ['private'] };
    ctx.req.params = { id: ctx.record.id };
    ctx.req.body = { keyId: 2, registerId: 1, data: { public: 'visible' }, skipRecordIds: ['x'], records: [{ id: 'record-id', data: { a: 1 } }] };
    return ctx;
  };

  describe('PUT /records/:id', () => {
    it('does not restrict by tokens when strict is off', async () => {
      const { controller, req } = setupWrite();
      await controller.update(req, {});
      expect(controller.recordModel.isWritableById).not.toHaveBeenCalled();
      expect(controller.recordModel.update.mock.calls[0].slice(2)).toEqual([true, { accessInfo: {} }, false, undefined]);
      expect(controller.responseData).toHaveBeenCalled();
    });
    it('passes the server tokens of an untrusted caller when strict is on', async () => {
      const { controller, req } = setupWrite(true);
      await controller.update(req, {});
      expect(controller.recordModel.isWritableById).toHaveBeenCalledWith('record-id', ['private']);
      expect(controller.recordModel.update.mock.calls[0][5]).toEqual(['private']);
      expect(controller.responseData).toHaveBeenCalled();
    });
    it('returns 403 without writing for a foreign or missing row', async () => {
      const { controller, req } = setupWrite(true);
      controller.recordModel.isWritableById.mockResolvedValue(false);
      await controller.update(req, {});
      expect(controller.responseError.mock.calls[0][2]).toBe(403);
      expect(controller.recordModel.update).not.toHaveBeenCalled();
      expect(controller.responseData).not.toHaveBeenCalled();
    });
    it('returns 403 when the atomic write matched no row', async () => {
      const { controller, req } = setupWrite(true);
      controller.recordModel.update.mockResolvedValue({ data: undefined });
      await controller.update(req, {});
      expect(controller.responseError.mock.calls[0][2]).toBe(403);
    });
    it('returns 500, not 403, when the write throws', async () => {
      const { controller, req } = setupWrite(true);
      controller.recordModel.update.mockRejectedValue(new Error('db'));
      await controller.update(req, {});
      expect(controller.responseError.mock.calls[0][2]).toBe(500);
    });
    it('does not restrict trusted callers when strict is on', async () => {
      const { controller, req } = setupWrite(true);
      req.auth.user = 'task';
      await controller.update(req, {});
      expect(controller.recordModel.isWritableById).not.toHaveBeenCalled();
      expect(controller.recordModel.update.mock.calls[0][5]).toBeUndefined();
    });
  });

  describe('POST /records/bulk (updates by id and by data field)', () => {
    it.each([
      [undefined, 'reader', undefined],
      [true, 'reader', ['private']],
      [true, 'task', undefined],
    ])('strict=%s caller=%s passes tokens %j', async (strict, user, tokens) => {
      const { controller, req } = setupWrite(strict);
      req.auth.user = user;
      await controller.bulkImport(req, {});
      expect(controller.recordModel.update.mock.calls[0][5]).toEqual(tokens);
      req.body.updateByDataField = 'a';
      await controller.bulkImport(req, {});
      expect(controller.recordModel.updateByDataField.mock.calls[0][1]).toEqual(tokens);
    });
    it('does not count rows the caller may not write', async () => {
      const { controller, req } = setupWrite(true);
      controller.recordModel.update.mockResolvedValue({ data: undefined });
      await controller.bulkImport(req, {});
      expect(controller.responseData.mock.calls[0][1]).toMatchObject({ updatedRecords: 0 });
    });
  });
});

describe('RG-02d: row tokens a restricted caller may assign (auth.strict)', () => {
  beforeAll(() => {
    (global as any).typeOf = (value) => typeof value;
  });
  afterAll(() => {
    delete (global as any).typeOf;
  });

  const setupTokens = (strict?: boolean) => {
    const ctx = setup();
    Object.assign(ctx.controller, {
      sandbox: { evalWithArgs: jest.fn().mockReturnValue('s') },
      checkXss: jest.fn(),
      registerModel: { findById: jest.fn().mockResolvedValue({ data: { id: 1 } }) },
      recordModel: {
        create: jest.fn().mockResolvedValue({ data: ctx.record }),
        update: jest.fn().mockResolvedValue({ data: ctx.record }),
        updatePatch: jest.fn().mockResolvedValue(ctx.record),
        updateByDataField: jest.fn().mockResolvedValue({ data: ctx.record }),
        bulkCreate: jest.fn().mockResolvedValue(0),
        isWritableById: jest.fn().mockResolvedValue(true),
      },
    });
    ctx.controller.keyModel.checkRecordsWritable = jest.fn().mockReturnValue(true);
    ctx.controller.keyModel.checkRecordsWritableById = jest.fn().mockResolvedValue(true);
    ctx.controller.config.auth.strict = strict;
    ctx.controller.config.auth.userAllowTokens = { reader: ['mine'] };
    ctx.req.params = { id: ctx.record.id };
    return ctx;
  };
  const body = (allowTokens?: any) => ({ keyId: 2, registerId: 1, data: { public: 'visible' }, allowTokens });

  describe.each([
    ['POST /records', 'create', 'create'],
    ['PUT /records/:id', 'update', 'update'],
  ])('%s', (_name, method, modelMethod) => {
    const call = async (strict: boolean | undefined, tokens: any, user = 'reader') => {
      const ctx = setupTokens(strict);
      ctx.req.auth.user = user;
      ctx.req.body = body(tokens);
      await ctx.controller[method](ctx.req, {});
      return ctx;
    };
    it.each([[['mine']], [[]], [undefined]])('allows %j for an untrusted caller', async (tokens) => {
      const { controller } = await call(true, tokens);
      expect(controller.recordModel[modelMethod]).toHaveBeenCalled();
      expect(controller.responseError).not.toHaveBeenCalled();
    });
    it.each([[['other']], [['mine', 'other']]])('refuses %j with 403 and writes nothing', async (tokens) => {
      const { controller } = await call(true, tokens);
      expect(controller.responseError.mock.calls[0][2]).toBe(403);
      expect(controller.recordModel[modelMethod]).not.toHaveBeenCalled();
    });
    it('does not restrict when strict is off', async () => {
      const { controller } = await call(undefined, ['other']);
      expect(controller.recordModel[modelMethod]).toHaveBeenCalled();
    });
    it('does not restrict a trusted caller', async () => {
      const { controller } = await call(true, ['other'], 'task');
      expect(controller.recordModel[modelMethod]).toHaveBeenCalled();
    });
  });

  it('PUT forwards the new tokens to the model so it can refuse dropping row tokens', async () => {
    const { controller, req } = setupTokens(true);
    req.body = body(['mine']);
    await controller.update(req, {});
    expect(controller.recordModel.update.mock.calls[0][1].allowTokens).toEqual(['mine']);
    expect(controller.recordModel.update.mock.calls[0][5]).toEqual(['mine']);
  });

  describe('PATCH /records/:id', () => {
    const patch = async (strict: boolean | undefined, path: string, user = 'reader') => {
      const ctx = setupTokens(strict);
      ctx.req.auth.user = user;
      ctx.req.body = { keyId: 2, properties: [{ path, previousValue: 'a', value: 'b' }] };
      await ctx.controller.updatePatch(ctx.req, {});
      return ctx;
    };
    it.each([
      'key_id',
      'id',
      'meta',
      'created_by',
      'updated_by',
      'created_at',
      'allow_tokens',
      'allowTokens',
      'allow_tokens.0',
      'dataX',
      'meta.x',
      '',
    ])('rejects the non-data path "%s" with 400 for every caller, whatever strict says', async (path) => {
      for (const [strict, user] of [
        [true, 'reader'],
        [undefined, 'reader'],
        [true, 'task'],
        [undefined, 'task'],
      ] as const) {
        const { controller } = await patch(strict, path, user);
        expect(controller.responseError.mock.calls[0][2]).toBe(400);
        expect(controller.recordModel.updatePatch).not.toHaveBeenCalled();
      }
    });
    it('rejects the whole request when one of several paths is not under data', async () => {
      const ctx = setupTokens();
      ctx.req.body = {
        keyId: 2,
        properties: [
          { path: 'data.name', previousValue: 'a', value: 'b' },
          { path: 'key_id', previousValue: 1, value: 2 },
        ],
      };
      await ctx.controller.updatePatch(ctx.req, {});
      expect(ctx.controller.responseError.mock.calls[0][2]).toBe(400);
      expect(ctx.controller.recordModel.updatePatch).not.toHaveBeenCalled();
    });
    it.each([
      ['a string', 'b'],
      ['a number', 5],
      ['null', null],
      ['an array', [1]],
    ])('rejects a bare data path with %s value (RG-02f)', async (_name, value) => {
      const ctx = setupTokens(true);
      ctx.req.body = { keyId: 2, properties: [{ path: 'data', previousValue: 'a', value }] };
      await ctx.controller.updatePatch(ctx.req, {});
      expect(ctx.controller.responseError.mock.calls[0][2]).toBe(400);
      expect(ctx.controller.recordModel.updatePatch).not.toHaveBeenCalled();
    });
    it('allows a bare data path with a plain object value (RG-02f)', async () => {
      const ctx = setupTokens(true);
      ctx.req.body = { keyId: 2, properties: [{ path: 'data', previousValue: 'a', value: { name: 'x' } }] };
      await ctx.controller.updatePatch(ctx.req, {});
      expect(ctx.controller.recordModel.updatePatch).toHaveBeenCalled();
      expect(ctx.controller.responseError).not.toHaveBeenCalled();
    });
    it.each(['data.name', 'data.a.b'])('allows the data path %s', async (path) => {
      const { controller } = await patch(true, path);
      expect(controller.recordModel.updatePatch).toHaveBeenCalled();
      expect(controller.responseError).not.toHaveBeenCalled();
    });
  });

  describe('POST /records/bulk', () => {
    const run = async (strict: boolean | undefined, records: any[], user = 'reader') => {
      const ctx = setupTokens(strict);
      ctx.req.auth.user = user;
      ctx.req.body = { registerId: 1, keyId: 2, records };
      await ctx.controller.bulkImport(ctx.req, {});
      return ctx;
    };
    it('refuses the whole request when one record carries foreign tokens', async () => {
      const { controller } = await run(true, [
        { data: {}, allowTokens: ['mine'] },
        { id: 'record-id', data: {}, allowTokens: ['other'] },
      ]);
      expect(controller.responseError.mock.calls[0][2]).toBe(403);
      expect(controller.recordModel.bulkCreate).not.toHaveBeenCalled();
      expect(controller.recordModel.update).not.toHaveBeenCalled();
    });
    it('accepts own tokens', async () => {
      const { controller } = await run(true, [{ data: {}, allowTokens: ['mine'] }]);
      expect(controller.recordModel.bulkCreate).toHaveBeenCalled();
    });
    it('leaves the tokens of updated rows unchanged when none are sent, only for a restricted caller', async () => {
      const restricted = await run(true, [{ id: 'record-id', data: {} }]);
      expect(restricted.controller.recordModel.update.mock.calls[0][1].allowTokens).toBeUndefined();
      const legacy = await run(undefined, [{ id: 'record-id', data: {} }]);
      expect(legacy.controller.recordModel.update.mock.calls[0][1].allowTokens).toEqual([]);
      const trusted = await run(true, [{ id: 'record-id', data: {} }], 'task');
      expect(trusted.controller.recordModel.update.mock.calls[0][1].allowTokens).toEqual([]);
    });
    it('does not restrict when strict is off or the caller is trusted', async () => {
      for (const [strict, user] of [
        [undefined, 'reader'],
        [true, 'task'],
      ] as const) {
        const { controller } = await run(strict, [{ data: {}, allowTokens: ['other'] }], user);
        expect(controller.recordModel.bulkCreate).toHaveBeenCalled();
      }
    });
  });
});

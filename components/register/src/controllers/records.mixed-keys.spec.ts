import RecordsController from './records';
import RecordEntity from '../entities/record';
import { setAppContext } from '../lib/context';

jest.mock('express-validator', () => ({
  matchedData: (req, options) => Object.assign({}, ...options.locations.map((location) => req[location] || {})),
}));

const makeRecord = (id: string, keyId: number, data: object) => new RecordEntity({ id, key_id: keyId, allow_tokens: [], data } as any);

const setup = (config: any = { auth: { trustedCallers: [] } }) => {
  const records = [makeRecord('r1', 1, { public: 'one', secret: 'one-secret' }), makeRecord('r2', 2, { public: 'two', secret: 'two-secret' })];
  const keys: Record<number, any> = {
    1: { id: 1, accessMode: 'full', schema: { responseFields: ['public', 'secret'] } },
    2: { id: 2, accessMode: 'full', schema: { properties: { secret: { allowTokens: ['private'] } } } },
  };
  const controller: any = Object.create(RecordsController.prototype);
  Object.assign(controller, {
    config: { pagination: { maxLimit: 100, packetLimit: 100 }, ...config },
    log: { save: jest.fn() },
    controllerMetric: jest.fn(),
    responseData: jest.fn(),
    responseError: jest.fn(),
    recordModel: {
      getAll: jest.fn().mockResolvedValue({ data: records, meta: { count: 2 } }),
      addDatesFilter: jest.fn(),
      normalizeSearchString: jest.fn((v) => v),
    },
    keyModel: {
      findById: jest.fn(async (id) => (keys[id] ? { data: keys[id] } : undefined)),
      checkRecordsReadable: jest.fn((key) => key.accessMode !== 'write_only'),
      checkRecordsReadableById: jest.fn().mockResolvedValue(true),
    },
    accessLogBusiness: { saveIfNeedIt: jest.fn() },
    checkValidationIdentity: jest.fn(),
    sandbox: { evalWithArgs: jest.fn() },
  });
  const req: any = { query: { register_id: 5 }, body: {}, auth: { user: 'reader' } };
  return { controller, records, keys, req };
};

describe.each(['getAll', 'getAllFiltered'])('RG-08: mixed-key page in %s', (method) => {
  it('projects every record with its own key', async () => {
    const { controller, records, req } = setup();
    await controller[method](req, {});
    expect(controller.responseError).not.toHaveBeenCalled();
    expect(records[0].data).toEqual({ public: 'one', secret: 'one-secret' });
    // Key 2 hides the protected column; key 1 rules are not applied to it.
    expect(records[1].data).toEqual({ public: 'two' });
    expect(controller.keyModel.findById).toHaveBeenCalledTimes(2);
  });

  it('loads each distinct key once', async () => {
    const { controller, records, req } = setup();
    records.push(makeRecord('r3', 1, { public: 'three' }));
    await controller[method](req, {});
    expect(controller.keyModel.findById).toHaveBeenCalledTimes(2);
  });

  it('returns 403 for the whole page when a later record has a write-only key', async () => {
    const { controller, keys, req } = setup();
    keys[2].accessMode = 'write_only';
    await controller[method](req, {});
    expect(controller.responseError).toHaveBeenCalledWith({}, 'Key records are not readable.', 403, { keyId: 2 });
    expect(controller.responseData).not.toHaveBeenCalled();
    expect(controller.accessLogBusiness.saveIfNeedIt).not.toHaveBeenCalled();
  });

  it('returns 403 when the key of a record is missing', async () => {
    const { controller, keys, req } = setup();
    delete keys[2];
    await controller[method](req, {});
    expect(controller.responseError).toHaveBeenCalledWith({}, 'Key records are not readable.', 403, { keyId: 2 });
    expect(controller.responseData).not.toHaveBeenCalled();
  });

  it('keeps the trusted caller flags (allow_see_all_records skips projection)', async () => {
    const { controller, records, req } = setup({ auth: { trustedCallers: ['reader'] } });
    req.query.allow_see_all_records = 'true';
    await controller[method](req, {});
    expect(records[1].data).toEqual({ public: 'two', secret: 'two-secret' });
  });
});

describe('EC-35: rawSequelizeParams keeps the row-token filter', () => {
  beforeAll(() => {
    setAppContext({ typeOf: (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v) });
  });

  const sentFilter = (controller) => controller.recordModel.getAll.mock.calls[0][0].filter;

  it('ANDs a raw where (even one with its own or) under the token filter', async () => {
    const { controller, req } = setup({ auth: { trustedCallers: [], userAllowTokens: { reader: ['private'] } } });
    req.body = { rawSequelizeParams: { or: [{ allow_tokens: { overlap: ['other'] } }, { id: 'x' }], allow_tokens: ['other'] } };
    await controller.getAll(req, {});
    const filter = sentFilter(controller);
    expect(filter.allow_tokens).toEqual(['private']);
    const Op = require('sequelize').Op;
    expect(filter[Op.and]).toHaveLength(1);
    expect(filter[Op.and][0][Op.or]).toHaveLength(2);
    // Nothing from the raw params sits at the top level where the token OR is written.
    expect(Object.keys(filter).sort()).toEqual(['allow_tokens']);
  });

  it('cannot be used to drop the token filter by asking for allow_see_all_records', async () => {
    const { controller, req } = setup({ auth: { trustedCallers: [], userAllowTokens: { reader: ['private'] } } });
    req.body = { allow_see_all_records: true, rawSequelizeParams: { id: 'x' } };
    await controller.getAll(req, {});
    expect(sentFilter(controller).allow_tokens).toEqual(['private']);
  });

  it('passes only the raw params to a caller that sees all rows', async () => {
    const { controller, req } = setup({ auth: { trustedCallers: ['reader'] } });
    req.body = { allow_see_all_records: true, rawSequelizeParams: { id: 'x' } };
    await controller.getAll(req, {});
    expect(sentFilter(controller).allow_tokens).toBeUndefined();
  });
});

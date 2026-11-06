import ExportBusiness from './export';
import RecordEntity from '../entities/record';
import { ExportKeyForbiddenError, resolveExportAccess } from '../lib/export_access';

const rec = (extra: any = {}) =>
  new RecordEntity(
    {
      id: 'r1',
      register_id: 1,
      key_id: 5,
      data: { name: 'n', secret: 's', hidden: 'h' },
      allow_tokens: [],
      search_string: 'n s',
      search_string_2: 'x',
      search_string_3: 'y',
      ...extra,
    } as any,
    true,
  );

const key = (extra: any = {}) => ({
  id: 5,
  registerId: 1,
  accessMode: 'read_write',
  schema: { properties: { secret: { allowTokens: ['private'] } }, responseFields: ['name', 'secret'] },
  ...extra,
});

function build(keyValue: any, records: RecordEntity[]) {
  const business = Object.create(ExportBusiness.prototype) as any;
  business.log = { save: jest.fn() };
  business.toExport = {};
  business.keyModel = { findById: jest.fn().mockResolvedValue({ data: keyValue }) };
  business.registerModel = { findById: jest.fn().mockResolvedValue({ data: { id: 1 } }) };
  business.recordModel = { getByKeyId: jest.fn().mockResolvedValue({ data: records }) };
  return business as ExportBusiness & { recordModel: any; log: any };
}

describe('RG-10: export respects accessMode and field rules', () => {
  it('rejects a write_only key for a non-full export', async () => {
    const business = build(key({ accessMode: 'write_only' }), [rec()]);
    await expect(business.getKeyAndRegisterAndRecords(5)).rejects.toBeInstanceOf(ExportKeyForbiddenError);
    await expect(business.startPreparingToExport(5, {})).rejects.toBeInstanceOf(ExportKeyForbiddenError);
    expect(business.recordModel.getByKeyId).not.toHaveBeenCalled();
  });

  it('removes hidden columns and derived search strings for a non-full export', async () => {
    const business = build(key(), [rec()]);
    const { records } = await business.getKeyAndRegisterAndRecords(5);
    expect(records[0].data).toEqual({ name: 'n' });
    expect(records[0].searchString).toBeUndefined();
    expect(records[0].searchString2).toBeUndefined();
    expect(records[0].searchString3).toBeUndefined();
  });

  it('keeps tokened columns and search strings when nothing is hidden', async () => {
    const business = build(key(), [rec({ data: { name: 'n', secret: 's' }, allow_tokens: ['private'] })]);
    const { records } = await business.getKeyAndRegisterAndRecords(5, {}, { full: false, tokens: ['private'] });
    expect(records[0].data).toEqual({ name: 'n', secret: 's' });
    expect(records[0].searchString).toBe('n s');
  });

  it('skips rows protected by foreign allow tokens', async () => {
    const business = build(key({ schema: {} }), [rec({ allow_tokens: ['other'] }), rec({ id: 'r2' })]);
    const { records } = await business.getKeyAndRegisterAndRecords(5);
    expect(records.map((r) => r.id)).toEqual(['r2']);
  });

  it('gives a trusted caller the unchanged full dump, even for write_only keys', async () => {
    const business = build(key({ accessMode: 'write_only' }), [rec()]);
    const { records } = await business.getKeyAndRegisterAndRecords(5, {}, { full: true, tokens: [] });
    expect(records[0].data).toEqual({ name: 'n', secret: 's', hidden: 'h' });
    expect(records[0].searchString).toBe('n s');
    expect(records[0]).not.toHaveProperty('isEncrypted');
  });

  it('allows schema-only export of a write_only key', async () => {
    const business = build(key({ accessMode: 'write_only' }), [rec()]);
    await expect(business.startPreparingToExport(5, { onlySchema: true })).resolves.toEqual(expect.any(String));
  });
});

describe('RG-10: resolveExportAccess', () => {
  const config = { auth: { trustedCallers: ['register'], userAllowTokens: { viewer: ['private'] } } } as any;
  it('trusts only listed callers', () => {
    expect(resolveExportAccess({ auth: { user: 'register' } }, config)).toEqual({ full: true, tokens: [] });
    expect(resolveExportAccess({ auth: { user: 'viewer' } }, config)).toEqual({ full: false, tokens: ['private'] });
    expect(resolveExportAccess({ auth: { user: 'other' } }, config)).toEqual({ full: false, tokens: [] });
  });
});

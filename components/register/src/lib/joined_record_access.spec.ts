import JoinedRecordAccess from './joined_record_access';
import RecordEntity from '../entities/record';

const key = { id: 2, schema: { properties: { secret: { allowTokens: ['private'] } }, responseFields: ['public', 'secret'] } };
const primary = (extra = {}) =>
  Object.assign(new RecordEntity({ key_id: 1, data: { reference: 'linked' } } as any), {
    joined: new RecordEntity({
      id: 'linked',
      key_id: 2,
      allow_tokens: [],
      data: { public: 'visible', secret: 'hidden', internal: 'hidden' },
      ...extra,
    } as any),
  }) as any;
const model = () => ({ findById: jest.fn().mockResolvedValue({ data: key }), checkRecordsReadable: jest.fn().mockReturnValue(true) });

describe('RG-04: independently authorize joined data', () => {
  it('applies the linked key field policy and preserves the response shape', async () => {
    const record = primary();
    await new JoinedRecordAccess(model() as any).protect(record, 'reference');
    expect(record.joined).toEqual({ id: 'linked', data: { public: 'visible' } });
  });

  it('grants protected rows and fields only with server tokens', async () => {
    const record = primary({ allow_tokens: ['private'] });
    await new JoinedRecordAccess(model() as any, ['private']).protect(record, 'reference');
    expect(record.joined).toEqual({ id: 'linked', data: { public: 'visible', secret: 'hidden' } });
  });

  it.each([
    { allow_tokens: ['private'] },
    { allow_tokens: 'private' },
    { allow_tokens: [1] },
    { key_id: undefined },
    { is_encrypted: true },
    { data: { $encrypted: 'ciphertext' } },
    { data: null },
    { data: 'raw' },
  ])('omits inaccessible or malformed linked data: %j', async (extra) => {
    const record = primary(extra);
    await new JoinedRecordAccess(model() as any).protect(record, 'reference');
    expect(record.joined).toBeNull();
    expect(record.data).toEqual({ reference: 'linked' });
  });

  it('omits a link outside legacy limitedAccess keys', async () => {
    const record = primary();
    await new JoinedRecordAccess(model() as any, [], [1]).protect(record, 'reference');
    expect(record.joined).toBeNull();
  });

  it('omits a link whose primary reference field was hidden', async () => {
    const record = primary();
    record.data = {};
    await new JoinedRecordAccess(model() as any).protect(record, 'reference');
    expect(record.joined).toBeNull();
  });

  it.each(['missing', 'unreadable', 'error', 'invalid-schema'])('fails closed on %s linked key', async (failure) => {
    const record = primary();
    const keys = model();
    if (failure === 'missing') keys.findById.mockResolvedValue(undefined as any);
    if (failure === 'unreadable') keys.checkRecordsReadable.mockReturnValue(false);
    if (failure === 'error') keys.findById.mockRejectedValue(new Error('DB unavailable'));
    if (failure === 'invalid-schema') keys.findById.mockResolvedValue({ data: { ...key, schema: { responseFields: [1] } } } as any);
    const onError = jest.fn();
    await new JoinedRecordAccess(keys as any, [], undefined, onError).protect(record, 'reference');
    expect(record.joined).toBeNull();
    if (failure === 'error' || failure === 'invalid-schema') expect(onError).toHaveBeenCalled();
  });

  it('caches each linked key and does not mutate shared source data', async () => {
    const a = primary();
    const b = primary();
    b.joined = a.joined;
    const keys = model();
    const access = new JoinedRecordAccess(keys as any);
    await access.protect(a, 'reference');
    expect(b.joined.data).toMatchObject({ secret: 'hidden' });
    await access.protect(b, 'reference');
    expect(keys.findById).toHaveBeenCalledTimes(1);
    expect(a.joined).toEqual(b.joined);
  });

  it('exposeUnfiltered keeps the full linked data in the { id, data } shape (trusted callers)', () => {
    const record = primary({ allow_tokens: ['private'] });
    JoinedRecordAccess.exposeUnfiltered(record);
    expect(record.joined).toEqual({ id: 'linked', data: { public: 'visible', secret: 'hidden', internal: 'hidden' } });
  });
});

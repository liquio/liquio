import RecordModel, { InvalidSortError } from './record';

function buildModel() {
  const model: any = Object.create(RecordModel.prototype);
  model.model = { name: 'record' };
  return model;
}

describe('getSortEntriesAsArray', () => {
  const model = buildModel();

  it('accepts whitelisted columns', async () => {
    expect(await model.getSortEntriesAsArray({ created_at: 'desc' })).toEqual([['created_at', 'DESC']]);
    expect(await model.getSortEntriesAsArray({ id: 'ASC' })).toEqual([['id', 'ASC']]);
  });

  it('builds literals for data paths', async () => {
    const [a] = await model.getSortEntriesAsArray({ 'data.name': 'asc' });
    expect(a.val).toBe(`"record"."data"->'name' ASC`);
    const [b] = await model.getSortEntriesAsArray({ 'data.a.b': 'desc' });
    expect(b.val).toBe(`"record"."data"->'a'->'b' DESC`);
  });

  it('returns an empty list for null sort and empty object', async () => {
    expect(await model.getSortEntriesAsArray('null')).toEqual([]);
    expect(await model.getSortEntriesAsArray({})).toEqual([]);
  });

  it('supports the legacy array form', async () => {
    expect(await model.getSortEntriesAsArray([['created_at', 'asc']])).toEqual([['created_at', 'ASC']]);
  });

  const twentyOne = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`data.f${i}`, 'asc']));
  const invalid: [string, any][] = [
    ['unknown column', { nope: 'asc' }],
    ['camelCase alias', { createdAt: 'asc' }],
    ['allow_tokens', { allow_tokens: 'asc' }],
    ['meta', { meta: 'asc' }],
    ['meta path', { 'meta.user': 'asc' }],
    ['unknown root', { 'nope.x': 'asc' }],
    ['bare data', { data: 'asc' }],
    ['trailing dot', { 'data.': 'asc' }],
    ['empty segment', { 'data..x': 'asc' }],
    ['quote injection', { "data.x'; --": 'asc' }],
    ['smuggled key', { 'created_at]=asc&allow_see_all_records=1&z': 'asc' }],
    ['encoded smuggled key', { 'created_at%5D=asc&allow_see_all_records=1&z': 'asc' }],
    ['object direction', { created_at: { x: 'asc' } }],
    ['string sort', 'created_at'],
    ['short pair', [['created_at']]],
    ['too many entries', twentyOne],
  ];
  it.each(invalid)('rejects %s', async (_name, sort) => {
    await expect(model.getSortEntriesAsArray(sort)).rejects.toBeInstanceOf(InvalidSortError);
  });

  it('does not mutate the input', async () => {
    const input = { 'data.n': 'asc', created_at: 'desc' };
    await model.getSortEntriesAsArray(input);
    expect(input).toEqual({ 'data.n': 'asc', created_at: 'desc' });
  });
});

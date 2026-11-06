import Sequelize from 'sequelize';

import RecordModel from './record';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

const row = (id: string, data: object = {}) => ({ id, key_id: 1, allow_tokens: [], data });

function buildModel(rows: any[], joinedRows: any[] = []) {
  const model: any = Object.create(RecordModel.prototype);
  model.model = {
    findAndCountAll: jest.fn().mockResolvedValue({ count: rows.length, rows }),
    findAll: jest.fn().mockResolvedValue(joinedRows),
    sequelize: { query: jest.fn() },
  };
  model.getSortEntriesAsArray = jest.fn().mockResolvedValue([]);
  return model;
}

describe('RG-03: join_by keeps the row filters and uses no raw SQL', () => {
  it('applies the allow_tokens filter to the main page and count with joinBy', async () => {
    const model = buildModel([row(ID_A, { link: ID_B })], [row(ID_B, { x: 1 })]);
    const result = await model.getAll({ filter: { allow_tokens: ['t'], key_id: 1 }, joinBy: 'link', limit: 5, offset: 0 });
    const query = model.model.findAndCountAll.mock.calls[0][0];
    expect(query.where[Sequelize.Op.or]).toEqual([{ allow_tokens: { [Sequelize.Op.overlap]: [['t']] } }, { allow_tokens: [] }]);
    expect(model.model.sequelize.query).not.toHaveBeenCalled();
    expect(result.meta.count).toBe('1');
    expect((result.data[0] as any).joined.id).toBe(ID_B);
  });

  it('keeps data and created_at filters in the main query', async () => {
    const model = buildModel([]);
    const created = { [Sequelize.Op.gte]: new Date(0) };
    await model.getAll({ filter: { data: { name: "x' or 1=1 --" }, created_at: created }, joinBy: 'link' });
    const query = model.model.findAndCountAll.mock.calls[0][0];
    expect(query.where.data).toEqual({ name: "x' or 1=1 --" });
    expect(query.where.created_at).toBe(created);
  });

  it('loads linked rows with one batched query, validating UUIDs, and sets null when missing', async () => {
    const model = buildModel([row(ID_A, { link: ID_B }), row(ID_B, { link: ID_B }), row('c', { link: "x' or '1'='1" }), row('d', {})], [row(ID_B)]);
    const result = await model.getAll({ filter: {}, joinBy: 'link' });
    expect(model.model.findAll).toHaveBeenCalledTimes(1);
    expect(model.model.findAll.mock.calls[0][0].where.id[Sequelize.Op.in]).toEqual([ID_B]);
    expect(result.data.map((r: any) => r.joined && r.joined.id)).toEqual([ID_B, ID_B, null, null]);
  });

  it('does not query linked rows when no valid id is present', async () => {
    const model = buildModel([row(ID_A, { link: 'nope' })]);
    await model.getAll({ filter: {}, joinBy: 'link' });
    expect(model.model.findAll).not.toHaveBeenCalled();
  });

  it.each(["link' or 1=1 --", 'a.b', 'a b'])('rejects an unsafe join field %j', async (joinBy) => {
    const model = buildModel([row(ID_A)]);
    await expect(model.getAll({ filter: {}, joinBy })).rejects.toThrow('Invalid join field');
  });

  it('leaves non-join results unchanged', async () => {
    const model = buildModel([row(ID_A)]);
    const result = await model.getAll({ filter: {} });
    expect(result.meta.count).toBe(1);
    expect(result.data[0]).not.toHaveProperty('joined');
    expect(model.model.findAll).not.toHaveBeenCalled();
  });
});

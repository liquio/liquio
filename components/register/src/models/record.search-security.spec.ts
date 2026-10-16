import Sequelize from 'sequelize';

import RecordModel from './record';

describe('RG-07: search filters before count/pagination', () => {
  it.each([[], ['private']].map((tokens) => [tokens]))('uses server token overlap %j in the shared count/row query', async (tokens) => {
    const model: any = Object.create(RecordModel.prototype);
    model.model = { findAndCountAll: jest.fn().mockResolvedValue({ count: 2, rows: [] }) };
    model.queryMetric = jest.fn();
    const result = await model.search('1', 'data.public', ['target'], 1, 1, tokens);
    const query = model.model.findAndCountAll.mock.calls[0][0];
    expect(query.where[Sequelize.Op.or]).toEqual([{ allow_tokens: [] }, { allow_tokens: { [Sequelize.Op.overlap]: tokens } }]);
    expect(query.where[Sequelize.Op.and]).toEqual([{ 'data.public': { [Sequelize.Op.iLike]: '%target%' } }]);
    expect(query.limit).toBe(1);
    expect(query.offset).toBe(1);
    expect(result.meta).toEqual({ count: 2, limit: 1, offset: 1 });
  });
});

describe('RG-02b: updatePatch token filter', () => {
  const run = async (tokens?: string[]) => {
    const model: any = Object.create(RecordModel.prototype);
    model.model = { findOne: jest.fn().mockResolvedValue(undefined) };
    await model.updatePatch('11111111-1111-1111-1111-111111111111', 1, [], tokens);
    return model.model.findOne.mock.calls[0][0].where;
  };
  it('does not filter by tokens when none are given', async () => {
    expect((await run())[Sequelize.Op.or]).toBeUndefined();
  });
  it.each([[[]], [['private']]])('limits the row to public or overlapping tokens %j', async (tokens) => {
    expect((await run(tokens))[Sequelize.Op.or]).toEqual([{ allow_tokens: [] }, { allow_tokens: { [Sequelize.Op.overlap]: tokens } }]);
  });
});

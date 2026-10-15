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

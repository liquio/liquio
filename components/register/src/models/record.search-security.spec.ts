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

describe('RG-02c: row-token guard on writes', () => {
  const tokens = ['private'];
  const orWhere = [{ allow_tokens: [] }, { allow_tokens: { [Sequelize.Op.overlap]: tokens } }];
  const build = (overrides: any = {}) => {
    const model: any = Object.create(RecordModel.prototype);
    model.model = {
      findOne: jest.fn().mockResolvedValue({ id: 'r' }),
      findAll: jest.fn().mockResolvedValue([{ id: 'r' }]),
      update: jest.fn().mockResolvedValue([0, []]),
      destroy: jest.fn().mockResolvedValue(0),
      ...overrides,
    };
    model.historyModel = { createAfterhandlers: jest.fn() };
    model.findById = jest.fn().mockResolvedValue({ data: { id: 'r', keyId: 1, meta: {} } });
    (global as any).afterhandler = { validateRecord: jest.fn() };
    return model;
  };

  it('update filters the write itself and creates no afterhandlers when nothing matched', async () => {
    const model = build();
    const result = await model.update('r', { keyId: 1 }, true, undefined, false, tokens);
    expect(model.model.update.mock.calls[0][1].where).toEqual({ id: 'r', [Sequelize.Op.or]: orWhere });
    expect(result.data).toBeUndefined();
    expect(model.historyModel.createAfterhandlers).not.toHaveBeenCalled();
  });
  it('update refuses dropping row tokens in the write itself when restricted', async () => {
    const model = build();
    await model.update('r', { keyId: 1, allowTokens: ['private', 'extra'] }, true, undefined, false, tokens);
    expect(model.model.update.mock.calls[0][1].where).toEqual({
      id: 'r',
      allow_tokens: { [Sequelize.Op.contained]: ['private', 'extra'] },
      [Sequelize.Op.or]: orWhere,
    });
  });
  it('update does not add the contained condition without new tokens or when not restricted', async () => {
    const model = build({ update: jest.fn().mockResolvedValue([1, [{ id: 'r' }]]) });
    await model.update('r', { keyId: 1 }, true, undefined, false, tokens);
    expect(model.model.update.mock.calls[0][1].where).toEqual({ id: 'r', [Sequelize.Op.or]: orWhere });
    await model.update('r', { keyId: 1, allowTokens: [] });
    expect(model.model.update.mock.calls[1][1].where).toEqual({ id: 'r' });
  });
  it('update keeps the plain where without tokens', async () => {
    const model = build({ update: jest.fn().mockResolvedValue([1, [{ id: 'r' }]]) });
    await model.update('r', { keyId: 1 });
    expect(model.model.update.mock.calls[0][1].where).toEqual({ id: 'r' });
    expect(model.historyModel.createAfterhandlers).toHaveBeenCalled();
  });
  it('updateByDataField filters the write and skips afterhandlers when nothing matched', async () => {
    const model = build();
    const result = await model.updateByDataField(
      { keyId: 1, registerId: 1, record: { data: {}, meta: {} }, dataFieldName: 'a', dataFieldValue: 1 },
      tokens,
    );
    expect(model.model.update.mock.calls[0][1].where[Sequelize.Op.or]).toEqual(orWhere);
    expect(result.data).toBeUndefined();
    expect(model.historyModel.createAfterhandlers).not.toHaveBeenCalled();
  });
  it('isWritableById filters by tokens', async () => {
    const model = build();
    expect(await model.isWritableById('r', tokens)).toBe(true);
    expect(model.model.findOne.mock.calls[0][0].where).toEqual({ id: 'r', [Sequelize.Op.or]: orWhere });
  });
});

import RecordModel from './record';

const raw = (isEncrypted: boolean) => ({ registerId: 1, keyId: 2, data: { a: 1 }, meta: {}, user: 'u', allowTokens: [], isEncrypted }) as any;

function buildModel() {
  const model: any = Object.create(RecordModel.prototype);
  model.model = { bulkCreate: jest.fn().mockResolvedValue([{}]) };
  return model;
}

describe('RG-12: bulkCreate never skips hooks for encrypted records', () => {
  it('forces individual hooks for an encrypted key even with isDisableHooks=true', async () => {
    const model = buildModel();
    await model.bulkCreate([raw(true)], false, true);
    expect(model.model.bulkCreate.mock.calls[0][1]).toEqual({ individualHooks: true });
  });

  it('forces hooks when only some records are encrypted', async () => {
    const model = buildModel();
    await model.bulkCreate([raw(false), raw(true)], false, true);
    expect(model.model.bulkCreate.mock.calls[0][1]).toEqual({ individualHooks: true });
  });

  it('keeps the hook-less fast path for unencrypted records', async () => {
    const model = buildModel();
    await model.bulkCreate([raw(false)], false, true);
    expect(model.model.bulkCreate.mock.calls[0][1]).toEqual({ individualHooks: false });
  });
});

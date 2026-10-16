import RollbackBusiness from './rollback';

const historyRow = { recordId: 'r1', keyId: 5, data: { id: 'r1', data: { a: 1 }, meta: {}, created_by: 'u' }, person: {} };

function build(key: any, recordExists: boolean) {
  const b: any = Object.create(RollbackBusiness.prototype);
  b.historyModel = { findById: jest.fn().mockResolvedValue({ data: historyRow }) };
  b.keyModel = { findById: jest.fn().mockResolvedValue(key) };
  b.recordModel = {
    findById: jest.fn().mockResolvedValue(recordExists ? { data: { id: 'r1' } } : null),
    create: jest.fn().mockResolvedValue({ data: {} }),
    update: jest.fn().mockResolvedValue({ data: {} }),
  };
  return b;
}

const args: [any, any] = [
  { historyId: 'h', recordId: 'r1', keyId: 5 },
  { user: 'u', accessInfo: { userId: 'x', userName: 'y' } },
];

describe('RG-12: rollbackRecord keeps encryption state from the key', () => {
  it('creates a restored record of an encrypted key with isEncrypted=true', async () => {
    const b = build({ data: { registerId: 1, isEncrypted: true } }, false);
    await b.rollbackRecord(...args);
    expect(b.recordModel.create.mock.calls[0][0].isEncrypted).toBe(true);
  });

  it('updates an existing record of an encrypted key with isEncrypted=true', async () => {
    const b = build({ data: { registerId: 1, isEncrypted: true } }, true);
    await b.rollbackRecord(...args);
    expect(b.recordModel.update.mock.calls[0][1].isEncrypted).toBe(true);
  });

  it('keeps isEncrypted=false for an unencrypted key', async () => {
    const b = build({ data: { registerId: 1, isEncrypted: false } }, false);
    await b.rollbackRecord(...args);
    expect(b.recordModel.create.mock.calls[0][0].isEncrypted).toBe(false);
  });

  it('fails closed when the key does not exist', async () => {
    const b = build(null, false);
    await expect(b.rollbackRecord(...args)).rejects.toThrow('Key of the records to rollback does not exist');
    expect(b.recordModel.create).not.toHaveBeenCalled();
  });
});

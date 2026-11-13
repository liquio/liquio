import RollbackBusiness, { RollbackKeyForbiddenError } from './rollback';
import KeyModel from '../models/key';

const historyRow = { recordId: 'r1', keyId: 5, data: { id: 'r1', data: { a: 1 }, meta: {}, created_by: 'u' }, person: {} };

function build(key: any, recordExists: boolean) {
  const b: any = Object.create(RollbackBusiness.prototype);
  b.historyModel = { findById: jest.fn().mockResolvedValue({ data: historyRow }) };
  b.keyModel = { findById: jest.fn().mockResolvedValue(key), checkRecordsWritable: KeyModel.prototype.checkRecordsWritable };
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
    const b = build({ data: { registerId: 1, accessMode: 'full', isEncrypted: true } }, false);
    await b.rollbackRecord(...args);
    expect(b.recordModel.create.mock.calls[0][0].isEncrypted).toBe(true);
  });

  it('updates an existing record of an encrypted key with isEncrypted=true', async () => {
    const b = build({ data: { registerId: 1, accessMode: 'full', isEncrypted: true } }, true);
    await b.rollbackRecord(...args);
    expect(b.recordModel.update.mock.calls[0][1].isEncrypted).toBe(true);
  });

  it('keeps isEncrypted=false for an unencrypted key', async () => {
    const b = build({ data: { registerId: 1, accessMode: 'full', isEncrypted: false } }, false);
    await b.rollbackRecord(...args);
    expect(b.recordModel.create.mock.calls[0][0].isEncrypted).toBe(false);
  });

  it('fails closed when the key does not exist', async () => {
    const b = build(null, false);
    await expect(b.rollbackRecord(...args)).rejects.toThrow('Key of the records to rollback does not exist');
    expect(b.recordModel.create).not.toHaveBeenCalled();
  });
});

describe('RG-27: rollback respects key accessMode', () => {
  it('rejects rollbackRecord on a read_only key and writes nothing', async () => {
    const b = build({ data: { registerId: 1, accessMode: 'read_only' } }, true);
    await expect(b.rollbackRecord(...args)).rejects.toBeInstanceOf(RollbackKeyForbiddenError);
    expect(b.recordModel.update).not.toHaveBeenCalled();
    expect(b.recordModel.create).not.toHaveBeenCalled();
  });

  it('rolls back a write_only key (writable)', async () => {
    const b = build({ data: { registerId: 1, accessMode: 'write_only' } }, true);
    await b.rollbackRecord(...args);
    expect(b.recordModel.update).toHaveBeenCalled();
  });

  it('rejects rollbackRecord when the history row belongs to another key', async () => {
    const b = build({ data: { registerId: 1, accessMode: 'full' } }, true);
    await expect(b.rollbackRecord({ historyId: 'h', recordId: 'r1', keyId: 6 }, args[1])).rejects.toThrow("don't match");
    expect(b.recordModel.update).not.toHaveBeenCalled();
  });

  it('rejects startRollback on a read_only key before any rollback starts', async () => {
    const b = build({ data: { registerId: 1, accessMode: 'read_only' } }, true);
    b.toRollback = {};
    b.rollback = jest.fn();
    await expect(b.startRollback({ keyId: 5, timePoint: new Date().toJSON() }, { user: 'u' })).rejects.toBeInstanceOf(RollbackKeyForbiddenError);
    expect(b.rollback).not.toHaveBeenCalled();
  });

  it('starts rollback on a full key', async () => {
    const b = build({ data: { registerId: 1, accessMode: 'full' } }, true);
    b.toRollback = {};
    b.rollback = jest.fn();
    jest.spyOn(global, 'setTimeout').mockReturnValueOnce(0 as any);
    const id = await b.startRollback({ keyId: 5, timePoint: new Date().toJSON() }, { user: 'u' });
    expect(typeof id).toBe('string');
    expect(b.rollback).toHaveBeenCalled();
  });
});

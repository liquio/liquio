import { Op } from 'sequelize';

const mockFileModel = { getAll: jest.fn(), update: jest.fn(), provider: { uploadFile: jest.fn() } };
const mockP7sSignatureModel = { getAll: jest.fn(), update: jest.fn() };

jest.mock('./handler', () => ({
  CliHandler: class {
    log = { write: jest.fn(), updateBottomBar: jest.fn() };
  },
}));
jest.mock('../../../models/file', () => ({ FileModel: jest.fn(() => mockFileModel) }));
jest.mock('../../../models/p7s_signature', () => ({ P7sSignatureModel: jest.fn(() => mockP7sSignatureModel) }));

import { CliMigrateHandler } from './migrate';

const NOT_EMPTY = { [Op.and]: { [Op.ne]: null, [Op.not]: '' } };

describe('CliMigrateHandler', () => {
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'nextTick', 'setImmediate'] }).setSystemTime(new Date('2025-03-04T10:00:00Z'));
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => (fn(), 0)) as any);
    delete (global as any).silentUpload;
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  it('should move inline file data to the provider and mark signatures with a folder', async () => {
    const f1 = { id: 'f1', contentType: 'text/plain', data: Buffer.from('1') };
    const f2 = { id: 'f2', contentType: 'image/png', data: Buffer.from('2') };
    const f3 = { id: 'f3', contentType: 'application/pdf', data: Buffer.from('3') };
    mockFileModel.getAll.mockResolvedValueOnce({ data: [f1, f2], meta: { count: 3 } }).mockResolvedValueOnce({ data: [f3], meta: { count: 1 } });
    const s1 = { id: 's1', p7s: 'sig' };
    mockP7sSignatureModel.getAll.mockResolvedValueOnce({ data: [s1], meta: { count: 1 } });

    const handler = new CliMigrateHandler();
    await handler.run();

    expect((global as any).silentUpload).toBe(true);
    expect(mockFileModel.getAll).toHaveBeenCalledWith({
      attributes: ['id', 'data', 'content_type'],
      filter: { data: NOT_EMPTY },
      limit: 10,
    });
    expect(mockFileModel.provider.uploadFile.mock.calls).toEqual([
      ['files/D20250304/f1', 'text/plain', f1.data],
      ['files/D20250304/f2', 'image/png', f2.data],
      ['files/D20250304/f3', 'application/pdf', f3.data],
    ]);
    expect(mockFileModel.update.mock.calls).toEqual([
      ['f1', { data: '', folder: 'files/D20250304' }],
      ['f2', { data: '', folder: 'files/D20250304' }],
      ['f3', { data: '', folder: 'files/D20250304' }],
    ]);

    expect(mockP7sSignatureModel.getAll).toHaveBeenCalledWith({
      attributes: ['id', 'p7s'],
      filter: { p7s: NOT_EMPTY },
      limit: 10,
    });
    expect(mockP7sSignatureModel.update).toHaveBeenCalledWith('s1', { id: 's1', p7s: 'sig', folder: 'p7s/D20250304' });

    expect(handler.log.write.mock.calls).toEqual([['Running migration...'], ['Running signature migration...']]);
    expect(handler.log.updateBottomBar.mock.calls).toEqual([
      ['Migrating file 1 of 3...'],
      ['Migrating file 2 of 3...'],
      ['Migrating file 3 of 3...'],
      ['Migrating signature 1 of 1...'],
      ['Migration complete!\n'],
    ]);
  });

  it('should finish when there is nothing to migrate', async () => {
    mockFileModel.getAll.mockResolvedValueOnce({ data: [], meta: { count: 0 } });
    mockP7sSignatureModel.getAll.mockResolvedValueOnce({ data: [], meta: { count: 0 } });

    const handler = new CliMigrateHandler();
    await handler.run();

    expect(mockFileModel.provider.uploadFile).not.toHaveBeenCalled();
    expect(mockP7sSignatureModel.update).not.toHaveBeenCalled();
    expect(handler.log.updateBottomBar).toHaveBeenLastCalledWith('Migration complete!\n');
  });
});

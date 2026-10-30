import moment from 'moment';
import { Op } from 'sequelize';

const mockProvider = { downloadFileAsBuffer: jest.fn(), uploadFile: jest.fn(), deleteFile: jest.fn() };
const mockFileModel = { getAll: jest.fn(), update: jest.fn(), provider: mockProvider };
const mockP7sSignatureModel = { getAll: jest.fn(), update: jest.fn() };

jest.mock('./handler', () => ({
  CliHandler: class {
    log = { write: jest.fn(), updateBottomBar: jest.fn() };
  },
}));
jest.mock('../../../models/file', () => ({ FileModel: jest.fn(() => mockFileModel) }));
jest.mock('../../../models/p7s_signature', () => {
  // A real class so the handler's `instanceof P7sSignatureModel` check still holds.
  class P7sSignatureModel {
    constructor() {
      return Object.setPrototypeOf(mockP7sSignatureModel, P7sSignatureModel.prototype);
    }
  }
  return { P7sSignatureModel };
});

import { CliSeparateHandler } from './separate';
import { resetAppContext, getSilentUpload } from '../../context';
import { FileEntity } from '../../../entities/file';

const FOLDER = 'files/D20250101';
const MAXIMUM_FILES = 2000;

const fileEntity = (id: string, folder = FOLDER, contentType = 'text/plain') =>
  Object.assign(Object.create(FileEntity.prototype), { id, folder, contentType });
const signature = (id: string, fileId: string, folder = FOLDER) => ({ id, fileId, folder });
const fullFolder = (folder = FOLDER) => Array.from({ length: MAXIMUM_FILES }, (_, i) => fileEntity(`f${i}`, folder));

describe('CliSeparateHandler', () => {
  let setTimeoutSpy: jest.SpyInstance;
  let handler: CliSeparateHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    resetAppContext();
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => (fn(), 0)) as any);
    mockFileModel.getAll.mockResolvedValue({ data: [] });
    mockP7sSignatureModel.getAll.mockResolvedValue({ data: [] });
    mockProvider.downloadFileAsBuffer.mockResolvedValue(Buffer.from('content'));
    handler = new CliSeparateHandler();
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  it('should reject invalid dates', async () => {
    await handler.run('not-a-date', undefined);

    expect(handler.log.write.mock.calls).toEqual([['Separate command executed'], ['Invalid date, use format YYYY-MM-DD']]);
    expect(mockFileModel.getAll).not.toHaveBeenCalled();
  });

  it('should query files and signatures in the date range with a non-empty folder', async () => {
    await handler.run('2025-01-01', '2025-01-31');

    expect(getSilentUpload()).toBe(true);
    const filter = {
      created_at: {
        [Op.between]: [moment('2025-01-01', 'YYYY-MM-DD').startOf('day').toDate(), moment('2025-01-31', 'YYYY-MM-DD').endOf('day').toDate()],
      },
      folder: { [Op.and]: { [Op.ne]: null, [Op.not]: '' } },
    };
    expect(mockFileModel.getAll).toHaveBeenCalledWith({ attributes: ['id', 'folder', 'content_type'], limit: 1000000000, filter });
    expect(mockP7sSignatureModel.getAll).toHaveBeenCalledWith({ attributes: ['id', 'folder', 'file_id'], limit: 1000000000, filter });
    expect(handler.log.write.mock.calls).toEqual([
      ['Separate command executed'],
      ['Separating files from 2025-01-01 to 2025-01-31'],
      ['Found 0 files to separate'],
    ]);
    expect(handler.log.updateBottomBar).toHaveBeenLastCalledWith('Separate command executed successfully\n');
  });

  it('should use the start date as end date when the end date is omitted', async () => {
    await handler.run('2025-01-05', undefined);

    expect(handler.log.write).toHaveBeenCalledWith('Separating files from 2025-01-05 to 2025-01-05');
  });

  it('should keep files in folders that are under the limit', async () => {
    mockFileModel.getAll.mockResolvedValue({ data: [fileEntity('f1'), fileEntity('f2')] });
    mockP7sSignatureModel.getAll.mockResolvedValue({ data: [signature('s1', 'f1')] });

    await handler.run('2025-01-01', undefined);

    expect(handler.log.write).toHaveBeenCalledWith('Found 3 files to separate');
    expect(handler.log.updateBottomBar).toHaveBeenCalledWith('Processing file 3 of 3...');
    expect(mockProvider.uploadFile).not.toHaveBeenCalled();
    expect(mockProvider.deleteFile).not.toHaveBeenCalled();
  });

  it('should move files over the limit into a numbered sibling folder', async () => {
    const overflowFile = fileEntity('extra', FOLDER, 'image/png');
    mockFileModel.getAll.mockResolvedValue({ data: [...fullFolder(), overflowFile] });
    const overflowSignature = signature('s1', 'sigfile');
    mockP7sSignatureModel.getAll.mockResolvedValue({ data: [overflowSignature] });

    await handler.run('2025-01-01', undefined);

    expect(mockProvider.downloadFileAsBuffer.mock.calls).toEqual([[`${FOLDER}/extra`], [`${FOLDER}/sigfile`]]);
    expect(mockProvider.uploadFile.mock.calls).toEqual([
      [`${FOLDER}-1/extra`, 'image/png', Buffer.from('content')],
      [`${FOLDER}-1/sigfile`, undefined, Buffer.from('content')],
    ]);
    expect(mockFileModel.update).toHaveBeenCalledWith('extra', { folder: `${FOLDER}-1` });
    expect(mockP7sSignatureModel.update).toHaveBeenCalledWith('s1', { folder: `${FOLDER}-1` });
    expect(mockProvider.deleteFile.mock.calls).toEqual([[`${FOLDER}/extra`], [`${FOLDER}/sigfile`]]);
    expect(handler.log.updateBottomBar).toHaveBeenCalledWith(`Moving file extra to ${FOLDER}-1...`);
    expect(handler.log.updateBottomBar).toHaveBeenCalledWith(`Moving file sigfile to ${FOLDER}-1...`);
  });

  it('should strip an existing suffix and skip full numbered folders', async () => {
    mockFileModel.getAll.mockResolvedValue({
      data: [...fullFolder(`${FOLDER}-1`), ...fullFolder(`${FOLDER}-2`), fileEntity('extra', `${FOLDER}-2`)],
    });

    await handler.run('2025-01-01', undefined);

    expect(mockProvider.uploadFile).toHaveBeenCalledWith(`${FOLDER}-3/extra`, 'text/plain', Buffer.from('content'));
    expect(mockFileModel.update).toHaveBeenCalledWith('extra', { folder: `${FOLDER}-3` });
  });

  it('should log and continue when moving a file fails', async () => {
    mockFileModel.getAll.mockResolvedValue({ data: [...fullFolder(), fileEntity('bad'), fileEntity('good')] });
    mockProvider.downloadFileAsBuffer.mockRejectedValueOnce(new Error('download failed'));

    await handler.run('2025-01-01', undefined);

    expect(handler.log.write).toHaveBeenCalledWith('Error processing file bad');
    expect(mockFileModel.update).not.toHaveBeenCalledWith('bad', expect.anything());
    expect(mockFileModel.update).toHaveBeenCalledWith('good', { folder: `${FOLDER}-1` });
    expect(handler.log.updateBottomBar).toHaveBeenLastCalledWith('Separate command executed successfully\n');
  });
});

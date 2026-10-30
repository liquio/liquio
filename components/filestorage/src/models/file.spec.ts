import { FileModel } from './file';
import { FileHash } from '../lib/file_hash';

const FILE_ID = 'f1';
const FOLDER = 'files/D20250101';
const DATA = Buffer.from('original bytes');

describe('FileModel', () => {
  let sequelizeModel: any;
  let provider: any;

  const createModel = (config: any = {}, withProvider = true) => {
    FileModel.singleton = undefined as any;
    return new FileModel(config, withProvider ? provider : undefined);
  };

  beforeEach(() => {
    global.log = { save: jest.fn() } as any;
    sequelizeModel = {
      findByPk: jest.fn(),
      destroy: jest.fn().mockResolvedValue(1),
      update: jest.fn(),
    };
    global.db = { define: jest.fn(() => sequelizeModel) } as any;
    provider = {
      deleteFile: jest.fn().mockResolvedValue(undefined),
      downloadFileAsBuffer: jest.fn().mockResolvedValue(DATA),
    };
  });

  describe('delete', () => {
    beforeEach(() => {
      sequelizeModel.findByPk.mockResolvedValue({ id: FILE_ID, folder: FOLDER });
    });

    it('should delete provider object first and then the DB row', async () => {
      const order: string[] = [];
      provider.deleteFile.mockImplementation(async () => order.push('provider'));
      sequelizeModel.destroy.mockImplementation(async () => (order.push('db'), 1));

      const result = await createModel().delete(FILE_ID);

      expect(provider.deleteFile).toHaveBeenCalledWith(`${FOLDER}/${FILE_ID}`);
      expect(order).toEqual(['provider', 'db']);
      expect(result).toEqual({ data: 1 });
    });

    it('should keep the DB row and throw when provider delete fails', async () => {
      provider.deleteFile.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }));

      await expect(createModel().delete(FILE_ID)).rejects.toThrow('Forbidden');
      expect(sequelizeModel.destroy).not.toHaveBeenCalled();
    });

    it.each([
      ['openstack 404', Object.assign(new Error('x'), { statusCode: 404 })],
      ['minio NoSuchKey code', Object.assign(new Error('x'), { code: 'NoSuchKey' })],
      ['minio NoSuchKey message', new Error('<Code>NoSuchKey</Code>')],
    ])('should treat provider not found (%s) as success and remove the row', async (_name, error) => {
      provider.deleteFile.mockRejectedValue(error);

      const result = await createModel().delete(FILE_ID);

      expect(sequelizeModel.destroy).toHaveBeenCalledWith({ where: { id: FILE_ID } });
      expect(result).toEqual({ data: 1 });
    });

    it('should be idempotent when row is already gone', async () => {
      sequelizeModel.findByPk.mockResolvedValue(null);
      sequelizeModel.destroy.mockResolvedValue(0);

      await expect(createModel().delete(FILE_ID)).resolves.toEqual({ data: 0 });
      expect(provider.deleteFile).toHaveBeenCalledWith(`files/${FILE_ID}`);
    });

    it('should not touch a provider when none is configured (data in DB)', async () => {
      const result = await createModel({}, false).delete(FILE_ID);

      expect(provider.deleteFile).not.toHaveBeenCalled();
      expect(result).toEqual({ data: 1 });
    });
  });

  describe('findById integrity (provider branch)', () => {
    const row = (hash: any) => ({
      id: FILE_ID,
      name: 'a.txt',
      contentType: 'text/plain',
      content_type: 'text/plain',
      content_length: DATA.length,
      container_id: 1,
      data: Buffer.from([]),
      hash,
      meta: {},
      folder: FOLDER,
      created_by: 'u',
      updated_by: 'u',
    });
    const goodHash = () => new FileHash(DATA).calc();

    it('should return data when sha256 matches', async () => {
      sequelizeModel.findByPk.mockResolvedValue(row(goodHash()));

      const { data } = await createModel().findById(FILE_ID);

      expect(data.data).toEqual(DATA);
    });

    it('should throw and log file-integrity-error (id only) on mismatch', async () => {
      sequelizeModel.findByPk.mockResolvedValue(row(goodHash()));
      provider.downloadFileAsBuffer.mockResolvedValue(Buffer.from('tampered'));

      await expect(createModel().findById(FILE_ID)).rejects.toThrow('integrity');
      expect(global.log.save).toHaveBeenCalledWith('file-integrity-error', { id: FILE_ID });
    });

    it('should serve legacy rows without hash and fill the hash', async () => {
      sequelizeModel.findByPk.mockResolvedValue(row({ md5: null, sha1: null, sha256: null }));
      sequelizeModel.update.mockResolvedValue([1, [row(goodHash())]]);

      const { data } = await createModel().findById(FILE_ID);

      expect(data.data).toEqual(DATA);
      expect(sequelizeModel.update).toHaveBeenCalled();
    });

    it('should skip the check when app.verifyIntegrity is false', async () => {
      sequelizeModel.findByPk.mockResolvedValue(row(goodHash()));
      provider.downloadFileAsBuffer.mockResolvedValue(Buffer.from('tampered'));

      const { data } = await createModel({ app: { verifyIntegrity: false } }).findById(FILE_ID);

      expect(data.data).toEqual(Buffer.from('tampered'));
    });
  });
});

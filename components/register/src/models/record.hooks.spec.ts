import RecordModel from './record';
import { getEncryption, resetAppContext, setAppContext } from '../lib/context';

function buildBeforeSave(): (record: any) => void {
  let options: any;
  setAppContext({ db: { define: jest.fn((_name, _attrs, opts) => ((options = opts), {})) } });
  (RecordModel as any).singleton = undefined;
  new RecordModel({}, { models: {} });
  return options.hooks.beforeSave;
}

describe('RG-13: record encryption hook fails closed', () => {
  afterEach(() => {
    resetAppContext();
  });

  it('stores $encrypted data on the happy path', () => {
    const beforeSave = buildBeforeSave();
    setAppContext({ encryption: { encrypt: jest.fn().mockReturnValue('cipher') } });
    const record: any = { is_encrypted: true, data: { secret: 1 } };
    beforeSave(record);
    expect(getEncryption().encrypt).toHaveBeenCalledWith(JSON.stringify({ secret: 1 }));
    expect(record.data).toEqual({ $encrypted: 'cipher' });
  });

  it('rejects the save and keeps no plaintext when the encryptor fails', () => {
    const beforeSave = buildBeforeSave();
    setAppContext({
      encryption: {
        encrypt: jest.fn(() => {
          throw new Error('Error while encrypting data: Invalid key length');
        }),
      },
    });
    const record: any = { is_encrypted: true, data: { secret: 1 } };
    expect(() => beforeSave(record)).toThrow('Error while encrypting data');
    expect(record.data).toEqual({ secret: 1 });
  });

  it('does not touch unencrypted records or already encrypted data', () => {
    const beforeSave = buildBeforeSave();
    setAppContext({ encryption: { encrypt: jest.fn() } });
    beforeSave({ is_encrypted: false, data: { a: 1 } });
    beforeSave({ is_encrypted: true, data: { $encrypted: 'x' } });
    expect(getEncryption().encrypt).not.toHaveBeenCalled();
  });
});

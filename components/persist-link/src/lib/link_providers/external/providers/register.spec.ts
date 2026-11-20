const logSave = jest.fn();
jest.mock('../../../context', () => ({
  getLog: () => ({ save: logSave }),
}));

const findRecordById = jest.fn();
const createRegisterApiClient = jest.fn(() => ({ findRecordById }));
jest.mock('@liquio/back-core', () => ({
  ...jest.requireActual('@liquio/back-core'),
  createRegisterApiClient: (...args) => (createRegisterApiClient as any)(...args),
}));

import RegisterProvider from './register';

describe('RegisterProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('client config', () => {
    it('should map url, token and default timeout', () => {
      new RegisterProvider({ url: 'https://register.example.com', token: 'abc' });

      expect(createRegisterApiClient).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://register.example.com', token: 'abc', timeout: 10000 }),
      );
    });

    it('should use a custom timeout when provided', () => {
      new RegisterProvider({ url: 'https://register.example.com', token: 'abc', timeout: 5000 });

      expect(createRegisterApiClient).toHaveBeenCalledWith(expect.objectContaining({ timeout: 5000 }));
    });

    it('should not throw on construction without config', () => {
      expect(() => new RegisterProvider(undefined)).not.toThrow();
      expect(createRegisterApiClient).not.toHaveBeenCalled();
    });
  });

  describe('getRecord', () => {
    it('should request the record by id and return its data', async () => {
      findRecordById.mockResolvedValue({ id: '1', name: 'Test' });
      const provider = new RegisterProvider({ url: 'https://register.example.com', token: 'abc' });

      const result = await provider.getRecord({ recordId: '1' });

      expect(findRecordById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('should return undefined when there is no data', async () => {
      findRecordById.mockResolvedValue(undefined);
      const provider = new RegisterProvider({ url: 'https://register.example.com', token: 'abc' });

      const result = await provider.getRecord({ recordId: '1' });

      expect(result).toBeUndefined();
      expect(logSave).toHaveBeenCalledWith('external-register-response', { recordId: '1', hasData: false, size: 0 });
    });

    it('should log and rethrow when the request fails', async () => {
      findRecordById.mockRejectedValue(new Error('Network error'));
      const provider = new RegisterProvider({ url: 'https://register.example.com', token: 'abc' });

      await expect(provider.getRecord({ recordId: '1' })).rejects.toThrow('Network error');
      expect(logSave).toHaveBeenCalledWith('external-register-error', { recordId: '1', error: 'Network error' });
    });

    it('should not log the token', async () => {
      findRecordById.mockResolvedValue({ id: '1' });
      const provider = new RegisterProvider({ url: 'https://register.example.com', token: 'secret-token' });

      await provider.getRecord({ recordId: '1' });

      expect(JSON.stringify(logSave.mock.calls)).not.toContain('secret-token');
    });
  });
});

const logSave = jest.fn();
jest.mock('../../../context', () => ({
  getLog: () => ({ save: logSave }),
}));

const gotMock = jest.fn();
jest.mock('got', () => gotMock);

import RegisterProvider from './register';

describe('RegisterProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecord', () => {
    it('should request the record by id and return its data', async () => {
      gotMock.mockResolvedValue({ data: { id: '1', name: 'Test' } });
      const provider = new RegisterProvider({ url: 'https://register.example.com', token: 'abc' });

      const result = await provider.getRecord({ recordId: '1' });

      expect(gotMock).toHaveBeenCalledWith({
        url: 'https://register.example.com/records/1',
        method: 'GET',
        timeout: 10000,
        headers: { token: 'abc', 'Content-Type': 'application/json' },
        responseType: 'json',
        resolveBodyOnly: true,
      });
      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('should use a custom timeout when provided in config', async () => {
      gotMock.mockResolvedValue({ data: {} });
      const provider = new RegisterProvider({ url: 'https://register.example.com', token: 'abc', timeout: 5000 });

      await provider.getRecord({ recordId: '1' });

      expect(gotMock).toHaveBeenCalledWith(expect.objectContaining({ timeout: 5000 }));
    });

    it('should return the falsy response as-is when there is no data', async () => {
      gotMock.mockResolvedValue(null);
      const provider = new RegisterProvider({ url: 'https://register.example.com', token: 'abc' });

      const result = await provider.getRecord({ recordId: '1' });

      expect(result).toBeNull();
    });

    it('should log and rethrow when the request fails', async () => {
      const error = new Error('Network error');
      gotMock.mockRejectedValue(error);
      const provider = new RegisterProvider({ url: 'https://register.example.com', token: 'abc' });

      await expect(provider.getRecord({ recordId: '1' })).rejects.toThrow('Network error');
      expect(logSave).toHaveBeenCalledWith('external-register-error', {
        recordId: '1',
        error: 'Network error',
      });
    });
  });
});

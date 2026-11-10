import { RegisterApiErrorMessage } from './errors';
import { RegisterApiClient } from './client';
import { createRegisterApiClient, getRegisterApiClient, resetRegisterApiClient } from './factory';

describe('register-api factory', () => {
  beforeEach(() => {
    resetRegisterApiClient();
  });

  describe('createRegisterApiClient', () => {
    it('creates an RegisterApiClient from the config', () => {
      const client = createRegisterApiClient({ server: 'http://register.test', port: 81 });

      expect(client).toBeInstanceOf(RegisterApiClient);
      expect(client.baseUrl).toBe('http://register.test:81');
    });

    it('creates a client with defaults without a config', () => {
      expect(createRegisterApiClient().baseUrl).toBe('http://register:8080');
    });

    it('creates independent instances', () => {
      expect(createRegisterApiClient({})).not.toBe(createRegisterApiClient({}));
    });
  });

  describe('getRegisterApiClient', () => {
    it('creates the client on the first call', () => {
      const client = getRegisterApiClient({ server: 'http://register.test', port: 81 });

      expect(client).toBeInstanceOf(RegisterApiClient);
      expect(client.baseUrl).toBe('http://register.test:81');
    });

    it('returns the same instance on later calls and ignores a new config', () => {
      const first = getRegisterApiClient({ server: 'http://register.test', port: 81 });
      const second = getRegisterApiClient({ server: 'http://other.test', port: 82 });

      expect(second).toBe(first);
      expect(second.baseUrl).toBe('http://register.test:81');
    });

    it('returns the existing instance when called without a config', () => {
      const first = getRegisterApiClient({ server: 'http://register.test', port: 81 });

      expect(getRegisterApiClient()).toBe(first);
    });

    it('throws when called without a config before initialization', () => {
      expect(() => getRegisterApiClient()).toThrow(RegisterApiErrorMessage.NotInitialized);
    });
  });

  describe('resetRegisterApiClient', () => {
    it('drops the instance so the next call creates a new one', () => {
      const first = getRegisterApiClient({ server: 'http://register.test', port: 81 });
      resetRegisterApiClient();
      const second = getRegisterApiClient({ server: 'http://other.test', port: 82 });

      expect(second).not.toBe(first);
      expect(second.baseUrl).toBe('http://other.test:82');
    });
  });
});

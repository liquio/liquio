import { IdApiClient } from './client';
import { createIdApiClient, getIdApiClient, resetIdApiClient } from './factory';

describe('id-api factory', () => {
  beforeEach(() => {
    resetIdApiClient();
  });

  describe('createIdApiClient', () => {
    it('creates an IdApiClient from the config', () => {
      const client = createIdApiClient({ server: 'http://id.test', port: 81 });

      expect(client).toBeInstanceOf(IdApiClient);
      expect(client.baseUrl).toBe('http://id.test:81');
    });

    it('creates a client with defaults without a config', () => {
      expect(createIdApiClient().baseUrl).toBe('http://id-api:8100');
    });

    it('creates independent instances', () => {
      expect(createIdApiClient({})).not.toBe(createIdApiClient({}));
    });
  });

  describe('getIdApiClient', () => {
    it('creates the client on the first call', () => {
      const client = getIdApiClient({ server: 'http://id.test', port: 81 });

      expect(client).toBeInstanceOf(IdApiClient);
      expect(client.baseUrl).toBe('http://id.test:81');
    });

    it('returns the same instance on later calls and ignores a new config', () => {
      const first = getIdApiClient({ server: 'http://id.test', port: 81 });
      const second = getIdApiClient({ server: 'http://other.test', port: 82 });

      expect(second).toBe(first);
      expect(second.baseUrl).toBe('http://id.test:81');
    });

    it('returns the existing instance when called without a config', () => {
      const first = getIdApiClient({ server: 'http://id.test', port: 81 });

      expect(getIdApiClient()).toBe(first);
    });

    it('throws when called without a config before initialization', () => {
      expect(() => getIdApiClient()).toThrow('Id-api client is not initialized. Pass a config on the first call.');
    });
  });

  describe('resetIdApiClient', () => {
    it('drops the instance so the next call creates a new one', () => {
      const first = getIdApiClient({ server: 'http://id.test', port: 81 });
      resetIdApiClient();
      const second = getIdApiClient({ server: 'http://other.test', port: 82 });

      expect(second).not.toBe(first);
      expect(second.baseUrl).toBe('http://other.test:82');
    });
  });
});

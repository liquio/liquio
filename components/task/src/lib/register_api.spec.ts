import { resetRegisterApiClient } from '@liquio/back-core';

import { initRegisterApiClient, withDefaultRecordsSort, deleteRegisterCache } from './register_api';
import { setAppContext, resetAppContext } from './context';

describe('register_api', () => {
  beforeEach(() => {
    resetRegisterApiClient();
    setAppContext({ log: { save: jest.fn() } as any });
  });

  afterEach(() => {
    resetRegisterApiClient();
    resetAppContext();
  });

  describe('initRegisterApiClient', () => {
    it('should apply the default timeout', () => {
      const client = initRegisterApiClient({ server: 'http://register.local', port: 8200, token: 'fake-token' });

      expect((client as any).config).toMatchObject({ timeout: 30000, token: 'fake-token' });
      expect(client.baseUrl).toBe('http://register.local:8200');
    });

    it('should work without a config', () => {
      const client = initRegisterApiClient();

      expect((client as any).config).toMatchObject({ timeout: 30000 });
    });

    it('should pass the timeout through', () => {
      const client = initRegisterApiClient({ server: 'http://register.local', port: 8200, timeout: 5000 });

      expect((client as any).config).toMatchObject({ timeout: 5000 });
    });
  });

  describe('withDefaultRecordsSort', () => {
    it('should set the default sort on the same object', () => {
      const params: any = { key_id: 1 };

      const result = withDefaultRecordsSort(params);

      expect(result).toBe(params);
      expect(params.sort).toEqual({ created_at: 'desc' });
    });

    it('should keep an explicit sort', () => {
      const params: any = { sort: { id: 'asc' } };

      expect(withDefaultRecordsSort(params).sort).toEqual({ id: 'asc' });
    });
  });

  describe('deleteRegisterCache', () => {
    it('should return 0 when Redis is disabled', async () => {
      expect(await deleteRegisterCache()).toBe(0);
    });

    it('should delete the register cache keys when Redis is enabled', async () => {
      const deleteMany = jest.fn().mockResolvedValue(3);
      setAppContext({ log: { save: jest.fn() } as any, redisClient: { deleteMany } as any });

      expect(await deleteRegisterCache()).toBe(3);
      expect(deleteMany).toHaveBeenCalledWith('bpmn-register.key.*');
    });
  });
});

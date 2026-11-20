import { withDefaultRecordsSort, deleteRegisterCache } from './register';
import { setAppContext, resetAppContext } from '../lib/context';

describe('register service helpers', () => {
  beforeEach(() => {
    setAppContext({ log: { save: jest.fn() } as any });
  });

  afterEach(() => {
    resetAppContext();
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

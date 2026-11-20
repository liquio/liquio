import { describe, expect, it, vi } from 'vitest';
import { retryOperation } from 'helpers/retryOperation';

describe('retryOperation', () => {
  it('resolves immediately when the test passes on the first try', async () => {
    const operation = vi.fn().mockResolvedValue(5);
    const result = await retryOperation(operation, [], '(result) => result === 5', 0, 3);
    expect(result).toBe(5);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries until the test passes, then rejects once retries are exhausted', async () => {
    const operation = vi.fn().mockResolvedValue(1);
    await expect(retryOperation(operation, [], '(result) => result === 5', 0, 2)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

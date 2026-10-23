import { describe, expect, it } from 'vitest';

import promiseChain from 'helpers/promiseChain';

describe('promiseChain', () => {
  it('passes the initial value through each step in order', async () => {
    const result = await promiseChain<number>([(n) => n + 1, async (n) => n * 10, (n) => n - 3], 1);
    expect(result).toBe(17);
  });

  it('resolves with the initial value for an empty chain', async () => {
    expect(await promiseChain<string>([], 'start')).toBe('start');
  });

  it('resolves with undefined when there is no initial value and no steps', async () => {
    expect(await promiseChain([])).toBeUndefined();
  });

  it('rejects and skips the remaining steps when a step throws', async () => {
    const calls: string[] = [];
    const chain = promiseChain<number>(
      [
        (n) => {
          calls.push('first');
          return n;
        },
        () => {
          throw new Error('boom');
        },
        (n) => {
          calls.push('third');
          return n;
        },
      ],
      1,
    );

    await expect(chain).rejects.toThrow('boom');
    expect(calls).toEqual(['first']);
  });
});

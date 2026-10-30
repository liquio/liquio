import { describe, expect, it } from 'vitest';
import promiseChain from 'helpers/promiseChain';

describe('promiseChain', () => {
  it('runs each function in sequence, threading the result forward', async () => {
    const add1 = (n: number) => n + 1;
    const double = (n: number) => Promise.resolve(n * 2);
    expect(await promiseChain([add1, double], 3)).toBe(8);
  });
});

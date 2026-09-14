import { describe, expect, it } from 'vitest';
import asyncFilter from 'helpers/asyncFilter';

describe('asyncFilter', () => {
  it('filters using an async predicate, preserving order', async () => {
    expect(await asyncFilter([1, 2, 3, 4], (n) => Promise.resolve(n % 2 === 0))).toEqual([2, 4]);
  });
});

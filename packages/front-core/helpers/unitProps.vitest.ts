import { describe, expect, it } from 'vitest';
import unitProps from 'helpers/unitProps';

describe('unitProps', () => {
  it('reads the given path from each unit menuConfig', () => {
    const units = [{ menuConfig: { a: { b: 1 } } }, { menuConfig: { a: { b: 2 } } }];
    expect(unitProps('a.b', units)).toEqual([1, 2]);
  });
});

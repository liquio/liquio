import { describe, expect, it } from 'vitest';
import dataFilter from 'helpers/dataFilter';

describe('dataFilter', () => {
  it('matches rows whose fields equal every filter value', () => {
    const predicate = dataFilter({ status: 'active' });
    expect(predicate({ status: 'active', name: 'a' })).toBe(true);
    expect(predicate({ status: 'inactive', name: 'a' })).toBe(false);
  });
});

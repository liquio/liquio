import { describe, expect, it } from 'vitest';
import dataSorter from 'helpers/dataSorter';

describe('dataSorter', () => {
  // Note: this comparator's 'asc'/'desc' labels are inverted from the usual convention
  // (preserved as-is from the original implementation).
  it('sorts by the given keys', () => {
    const rows = [{ age: 3 }, { age: 1 }, { age: 2 }];
    expect([...rows].sort(dataSorter({ age: 'asc' }))).toEqual([{ age: 3 }, { age: 2 }, { age: 1 }]);
    expect([...rows].sort(dataSorter({ age: 'desc' }))).toEqual([{ age: 1 }, { age: 2 }, { age: 3 }]);
  });
});

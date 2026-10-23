import { describe, expect, it } from 'vitest';
import dataSearch from 'helpers/dataSearch';

describe('dataSearch', () => {
  it('keeps rows with a field matching the search text, case-insensitively', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }];
    expect(dataSearch('ali', data)).toEqual([{ name: 'Alice' }]);
  });

  it('returns the data unchanged for an empty search', () => {
    const data = [{ name: 'Alice' }];
    expect(dataSearch('', data)).toBe(data);
  });
});

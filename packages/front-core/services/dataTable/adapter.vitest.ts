import { describe, expect, it } from 'vitest';
import adapter from 'services/dataTable/adapter';

describe('adapter', () => {
  it('reads the search value from the endpoint-configured filter field', () => {
    const result = adapter({ filters: { search: 'abc' } }, { sourceName: 's', dataURL: 'd', searchFilterField: 'search' });
    expect(result.search).toBe('abc');
  });

  it('defaults the search field to "name" when the endpoint does not configure one', () => {
    const result = adapter({ filters: { name: 'jane' } });
    expect(result.search).toBe('jane');
  });

  it('falls back to an empty search string when the field is absent', () => {
    const result = adapter({ filters: {} });
    expect(result.search).toBe('');
  });
});

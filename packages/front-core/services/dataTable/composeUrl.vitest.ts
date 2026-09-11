import { describe, expect, it } from 'vitest';
import composeUrl from 'services/dataTable/composeUrl';

describe('composeUrl', () => {
  it('builds a query string from page, rowsPerPage, filters, and sort', () => {
    const url = composeUrl('users', { page: 2, rowsPerPage: 10, filters: { name: 'jane' }, sort: { name: 'asc' } });
    expect(url).toContain('users?');
    expect(url).toContain('page=2');
    expect(url).toContain('count=10');
  });

  it('passes filters through untransformed when rawFilters is set', () => {
    const url = composeUrl('users', { filters: { 'raw.key': 'v' }, rawFilters: true });
    expect(url).toContain('raw.key=v');
  });

  it('returns the bare url when there is nothing to add', () => {
    expect(composeUrl('users', { filters: {} })).toBe('users');
  });
});

import { describe, expect, it } from 'vitest';
import mapDataDefault from 'services/dataTable/mapDataDefault';

describe('mapDataDefault', () => {
  it('extracts pagination fields from response meta', () => {
    const payload = { meta: { currentPage: 2, perPage: 10, total: 25 } };
    expect(mapDataDefault(payload)).toEqual({ data: payload, page: 2, rowsPerPage: 10, count: 25 });
  });

  it('tolerates a missing meta object', () => {
    expect(mapDataDefault({})).toEqual({ data: {}, page: undefined, rowsPerPage: undefined, count: undefined });
  });
});

import { describe, expect, it } from 'vitest';
import endPoint from 'services/dataTable/endpoints/registry';

describe('registry endpoint getDataUrl', () => {
  it('builds a filtered records URL, splitting keyId out of the query string', () => {
    const url = endPoint.getDataUrl!('registers/keys', {
      page: 2,
      rowsPerPage: 10,
      filters: { keyId: 42, control: 'a', strict: true, name: 'jane', extra: 'x' }
    });
    expect(url).toContain('registers/keys/42/records/filter?');
    expect(url).toContain('search=jane');
    expect(url).toContain('offset=10');
  });
});

describe('registry endpoint mapData', () => {
  it('reads rowsPerPage and count from the response meta', () => {
    const result = endPoint.mapData!({ meta: { limit: 20, count: 5 } });
    expect(result).toEqual({ data: { meta: { limit: 20, count: 5 } }, rowsPerPage: 20, count: 5 });
  });
});

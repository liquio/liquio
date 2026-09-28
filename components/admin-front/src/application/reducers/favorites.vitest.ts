import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/favorites';

describe('favorites reducer', () => {
  it('stores the payload under the entity name parsed from the request url', () => {
    const result = reducer(undefined, { type: 'GET_FAVORITES_SUCCESS', url: '/api/favorites/units', payload: [{ id: 1 }] });
    expect(result.units).toEqual([{ id: 1 }]);
  });
});

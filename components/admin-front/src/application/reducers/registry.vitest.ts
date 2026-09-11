import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/registry';

describe('registry reducer', () => {
  it('stores register keys by registerId', () => {
    const result = reducer(undefined, { type: 'GET_REGISTERS_KEYS_SUCCESS', request: { registerId: 5 }, payload: [{ id: 1 }] });
    expect(result[5]).toEqual([{ id: 1 }]);
  });
});

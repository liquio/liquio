import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/snippets';

describe('snippets reducer', () => {
  it('stores snippets on success and clears them on failure', () => {
    const loaded = reducer(undefined, { type: 'REQUEST_SNIPPETS_SUCCESS', payload: [{ id: 1 }] });
    expect(loaded.snippets).toEqual([{ id: 1 }]);

    const failed = reducer(loaded, { type: 'REQUEST_SNIPPETS_FAIL' });
    expect(failed.snippets).toEqual([]);
  });

  it('ignores a non-array payload on success', () => {
    const result = reducer(undefined, { type: 'REQUEST_SNIPPETS_SUCCESS', payload: 'not-an-array' });
    expect(result.snippets).toEqual([]);
  });
});

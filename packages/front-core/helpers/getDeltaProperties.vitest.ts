import { describe, expect, it } from 'vitest';
import getDeltaProperties from 'helpers/getDeltaProperties';

describe('getDeltaProperties', () => {
  it('reports changed scalar fields with their previous value', () => {
    expect(getDeltaProperties({ a: 2 }, { a: 1 })).toEqual([{ path: 'a', value: 2, previousValue: 1 }]);
  });

  it('reports added array items using the item index', () => {
    expect(getDeltaProperties({ list: [1, 2] }, { list: [1] })).toEqual([
      { path: 'list.1', value: 2, previousValue: undefined }
    ]);
  });

  it('ignores fields that did not actually change', () => {
    expect(getDeltaProperties({ a: 1 }, { a: 1 })).toEqual([]);
  });
});

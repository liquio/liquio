import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/registry';

describe('registry reducer', () => {
  it('stores related key records keyed by keyIds', () => {
    const result = reducer(undefined, {
      type: 'REQUEST_REGISTER_RELATED_KEY_RECORDS_SUCCESS',
      request: { keyIds: '1,2' },
      payload: [{ id: 1 }]
    });
    expect(result.relatedRecords['1,2']).toEqual([{ id: 1 }]);
  });

  it('stores custom data keyed by handler', () => {
    const result = reducer(undefined, {
      type: 'REGISTRY/REQUEST_CUSTOM_DATA_SUCCESS',
      request: { handler: 'h1' },
      payload: { value: 1 }
    });
    expect(result.customData.h1).toEqual({ value: 1 });
  });
});

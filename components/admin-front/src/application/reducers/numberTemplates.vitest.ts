import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/numberTemplates';

describe('numberTemplates reducer', () => {
  it('stores a template by id in both actual and origin', () => {
    const result = reducer(undefined, { type: 'REQUEST_NUMBER_TEMPLATE_SUCCESS', payload: { id: 1, name: 'a' } });
    expect(result.actual[1]).toEqual({ id: 1, name: 'a' });
    expect(result.origin[1]).toEqual({ id: 1, name: 'a' });
  });

  it('resets the "new" draft on CLEAR_NEW_NUMBER_TEMPLATE', () => {
    const withDraft = reducer(undefined, { type: 'UPDATE_NUMBER_TEMPLATE_DATA', payload: { id: 'new', name: 'draft' } });
    const cleared = reducer(withDraft, { type: 'CLEAR_NEW_NUMBER_TEMPLATE' });
    expect(cleared.actual.new).toEqual({});
  });
});

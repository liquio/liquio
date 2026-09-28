import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/workflowTemplate';

describe('workflowTemplate reducer', () => {
  it('stores a loaded template keyed by id', () => {
    const result = reducer(undefined, {
      type: 'LOAD_WORKFLOW_TEMPLATE_SUCCESS',
      payload: { id: 1, name: 'a' }
    });
    expect(result.actual[1]).toEqual({ id: 1, name: 'a' });
  });

  it('stores categories', () => {
    const result = reducer(undefined, {
      type: 'LOAD_WORKFLOW_CATEGORIES_SUCCESS',
      payload: [{ id: 1 }]
    });
    expect(result.categories).toEqual([{ id: 1 }]);
  });
});

import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/workflow';

describe('workflow reducer', () => {
  it('deselects when selecting a label element', () => {
    const withSelection = reducer(undefined, { type: 'WORKFLOW/ELEMENT_SELECT', payload: { type: 'other', businessObject: { id: 'a' } } });
    const result = reducer(withSelection, { type: 'WORKFLOW/ELEMENT_SELECT', payload: { type: 'label', businessObject: { id: 'a' } } });
    expect(result.selection).toBeNull();
  });

  it('returns the same state when re-selecting the currently selected element', () => {
    const withSelection = reducer(undefined, { type: 'WORKFLOW/ELEMENT_SELECT', payload: { type: 'other', businessObject: { id: 'a' } } });
    const result = reducer(withSelection, { type: 'WORKFLOW/ELEMENT_SELECT', payload: { type: 'other', businessObject: { id: 'a' } } });
    expect(result).toBe(withSelection);
  });

  it('removes a workflow category by id', () => {
    const withCategories = reducer(undefined, { type: 'WORKFLOW/REQUEST_WORKFLOW_CATEGORIES_SUCCESS', payload: [{ id: 1 }, { id: 2 }] });
    const result = reducer(withCategories, { type: 'WORKFLOW/DELETE_WORKFLOW_CATEGORY_SUCCESS', request: { categoryId: 1 } });
    expect(result.categories).toEqual([{ id: 2 }]);
  });
});

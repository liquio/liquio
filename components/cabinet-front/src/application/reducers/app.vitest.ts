import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/app';

describe('app reducer (cabinet-front)', () => {
  it('toggles the sidebar', () => {
    const result = reducer(undefined, { type: 'APP/SET_OPEN_SIDEBAR', payload: false });
    expect(result.openSidebar).toBe(false);
  });

  it('stores a ref under its own scrollbar key', () => {
    const result = reducer(undefined, {
      type: 'APP/SET_MAIN_SCROLLBAR',
      payload: { scrollbar: 'mainScrollbar', ref: { current: 'x' } }
    });
    expect(result.mainScrollbar).toEqual({ current: 'x' });
  });

  it('marks the navigation tree loaded even when the payload is not an array', () => {
    const result = reducer(undefined, { type: 'GET_NAVIGATION_TREE_SUCCESS', payload: null });
    expect(result.navigationTree).toBeNull();
    expect(result.navigationTreeLoaded).toBe(true);
  });
});

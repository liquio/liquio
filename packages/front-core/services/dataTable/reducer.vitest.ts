import { afterEach, describe, expect, it, vi } from 'vitest';
import createReducer from 'services/dataTable/reducer';
import dispatchType from 'services/dataTable/dispatchType';

// The reducer reads/writes filter presets via helpers/storage, which reads runtime config
// eagerly on import; stub it so this suite doesn't need a loaded app config.
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({}) }));

const endPoint = { sourceName: 'testTable', dataURL: 'test' };

afterEach(() => localStorage.clear());

describe('dataTable reducer', () => {
  it('starts loading on GET_LIST and applies the default mapData on success', () => {
    const reducer = createReducer(endPoint);
    let state = reducer(undefined, { type: dispatchType('testTable', 'GET_LIST') });
    expect(state.loading).toBe(true);

    state = reducer(state, {
      type: dispatchType('testTable', 'GET_LIST_SUCCESS'),
      payload: { meta: { currentPage: 2, perPage: 10, total: 20 }, data: [1, 2] }
    });
    expect(state.loading).toBe(false);
    expect(state.page).toBe(2);
    expect(state.count).toBe(20);
  });

  it('records the error message on GET_LIST_FAIL', () => {
    const reducer = createReducer(endPoint);
    const state = reducer(undefined, { type: dispatchType('testTable', 'GET_LIST_FAIL'), payload: { message: 'boom' } });
    expect(state.error).toBe('boom');
    expect(state.loading).toBe(false);
  });

  it('resets the page and selection on ON_FILTER_CHANGE', () => {
    const reducer = createReducer(endPoint);
    const state = reducer(undefined, { type: dispatchType('testTable', 'ON_FILTER_CHANGE'), payload: { name: 'a' } });
    expect(state.filters).toEqual({ name: 'a' });
    expect(state.page).toBe(1);
    expect(state.rowsSelected).toEqual([]);
  });

  it('persists filter presets to storage on ON_FILTER_PRESET_ADD', () => {
    const reducer = createReducer(endPoint);
    const state = reducer(undefined, { type: dispatchType('testTable', 'ON_FILTER_PRESET_ADD'), payload: { name: 'preset-1' } });
    expect(state.presets).toEqual([{ name: 'preset-1' }]);
    expect(JSON.parse(localStorage.getItem('useTablePresetstestTable') as string)).toEqual([{ name: 'preset-1' }]);
  });

  it('runs a custom reduce hook before the built-in switch, and resets state on CLEAR_FILTERS', () => {
    const reduce = vi.fn((state, action) => (action.type === 'CUSTOM' ? { ...state, custom: true } : state));
    const reducer = createReducer({ ...endPoint, reduce });
    const withCustom = reducer(undefined, { type: 'CUSTOM' });
    expect((withCustom as unknown as { custom: boolean }).custom).toBe(true);

    const cleared = reducer(withCustom, { type: dispatchType('testTable', 'CLEAR_FILTERS') });
    expect((cleared as unknown as { custom?: boolean }).custom).toBeUndefined();
  });

  it('returns state unchanged for an unrecognized action type', () => {
    const reducer = createReducer(endPoint);
    const state = reducer(undefined, { type: 'SOMETHING_ELSE' });
    const next = reducer(state, { type: 'SOMETHING_ELSE' });
    expect(next).toBe(state);
  });
});

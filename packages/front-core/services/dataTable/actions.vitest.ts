import { afterEach, describe, expect, it, vi } from 'vitest';

const getState = vi.fn();
const apiGet = vi.fn().mockResolvedValue({ data: [] });
const apiPost = vi.fn().mockResolvedValue({ data: [] });

vi.mock('store', () => ({ default: { getState, dispatch: vi.fn() } }));
vi.mock('services/api', () => ({ get: apiGet, post: apiPost, del: vi.fn(), put: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

const endPoint = { sourceName: 'testTable', dataURL: 'test' };

describe('dataTable actions', () => {
  it('closeError builds a namespaced ON_ERROR_CLOSE action', async () => {
    const { closeError } = await import('services/dataTable/actions');
    expect(closeError(endPoint)(2)).toEqual({ type: 'DATA_TABLE/TESTTABLE/ON_ERROR_CLOSE', payload: 2 });
  });

  it('onFilterPresetAdd builds a namespaced action carrying the preset', async () => {
    const { onFilterPresetAdd } = await import('services/dataTable/actions');
    expect(onFilterPresetAdd(endPoint)({ name: 'p1' })).toEqual({
      type: 'DATA_TABLE/TESTTABLE/ON_FILTER_PRESET_ADD',
      payload: { name: 'p1' }
    });
  });

  it('load issues a GET request against composeUrl by default', async () => {
    getState.mockReturnValue({ testTable: { filters: {} } });
    const { load } = await import('services/dataTable/actions');
    const dispatch = vi.fn();
    await load(endPoint)()(dispatch);
    expect(apiGet).toHaveBeenCalledWith('test', 'DATA_TABLE/TESTTABLE/GET_LIST', dispatch);
  });

  it('load issues a POST request with the request body when method is POST', async () => {
    getState.mockReturnValue({ testTable: { filters: {} } });
    const { load } = await import('services/dataTable/actions');
    const dispatch = vi.fn();
    await load({ ...endPoint, method: 'POST', requestData: { a: 1 } })()(dispatch);
    expect(apiPost).toHaveBeenCalledWith('test', { a: 1 }, 'DATA_TABLE/TESTTABLE/GET_LIST', dispatch);
  });

  it('isRowSelectable is selectable unless the item is finished', async () => {
    const { isRowSelectable } = await import('services/dataTable/actions');
    expect(isRowSelectable()({ finished: false })()).toBe(true);
    expect(isRowSelectable()({ finished: true })()).toBe(false);
  });

  it('onChangePage dispatches immediately and schedules a reload', async () => {
    vi.useFakeTimers();
    getState.mockReturnValue({ testTable: { filters: {} } });
    const { onChangePage } = await import('services/dataTable/actions');
    const dispatch = vi.fn();
    onChangePage(endPoint)(0, true, false)(dispatch);
    expect(dispatch).toHaveBeenCalledWith({ type: 'DATA_TABLE/TESTTABLE/ON_CHANGE_PAGE', payload: 1 });
    vi.runAllTimers();
    expect(apiGet).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

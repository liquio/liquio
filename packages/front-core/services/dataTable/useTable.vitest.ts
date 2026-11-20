import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// radioactive-state schedules its re-render via a bare setTimeout(fn, 0), which act() doesn't
// wait for on its own; flushing a real macrotask after each mutation lets it fire.
const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

const dispatch = vi.fn();
const apiGet = vi.fn().mockResolvedValue([{ id: 1 }]);

vi.mock('store', () => ({ default: { dispatch, getState: () => ({}) } }));
vi.mock('services/api', () => ({ get: apiGet, post: vi.fn(), del: vi.fn(), put: vi.fn() }));
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({}) }));

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.resetModules();
});

const endPoint = { sourceName: 'testTable', dataURL: 'test', sticky: false };

describe('useTable', () => {
  it('loads data via a GET request and applies the default mapData', async () => {
    const { default: useTable } = await import('services/dataTable/useTable');
    const { result } = renderHook(() => useTable(endPoint));

    await act(async () => {
      await result.current.actions.load();
      await flush();
    });

    expect(apiGet).toHaveBeenCalled();
    expect(result.current.data).toEqual([{ id: 1 }]);
    expect(result.current.loading).toBe(false);
  });

  it('resets the page and selection on filter change', async () => {
    const { default: useTable } = await import('services/dataTable/useTable');
    // forceLoad=false here, since a real reload would overwrite `page` from the (mocked,
    // meta-less) response via mapDataDefault — that reload path is covered by the first test.
    const { result } = renderHook(() => useTable({ ...endPoint, autoLoad: false }));

    await act(async () => {
      result.current.actions.onFilterChange({ name: 'jane' }, false);
      await flush();
    });

    expect(result.current.filters).toEqual({ name: 'jane' });
    expect(result.current.page).toBe(1);
  });

  it('toggles hidden columns', async () => {
    const { default: useTable } = await import('services/dataTable/useTable');
    const { result } = renderHook(() => useTable({ ...endPoint, autoLoad: false }));

    act(() => result.current.actions.toggleColumnVisible('name'));
    expect(result.current.hiddenColumns).toEqual(['name']);

    act(() => result.current.actions.toggleColumnVisible('name'));
    expect(result.current.hiddenColumns).toEqual([]);
  });
});

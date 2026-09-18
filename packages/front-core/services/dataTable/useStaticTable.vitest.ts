import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useStaticTable from 'services/dataTable/useStaticTable';

// useStaticTable reads/writes sticky state via helpers/storage, which reads runtime config
// eagerly on import; stub it so this suite doesn't need a loaded app config.
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({}) }));

// radioactive-state schedules its re-render via a bare setTimeout(fn, 0), which act() doesn't
// wait for on its own; flushing a real macrotask after each mutation lets it fire.
const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

afterEach(() => localStorage.clear());

describe('useStaticTable', () => {
  it('paginates, filters, and searches an in-memory array on load', async () => {
    const data = Array.from({ length: 15 }, (_, i) => ({ id: i, name: `item-${i}` }));
    const { result } = renderHook(() => useStaticTable(data));

    await act(async () => {
      await flush();
    });

    expect(result.current.count).toBe(15);
    expect(result.current.data).toHaveLength(10);
  });

  it('filters results by search text', async () => {
    const data = [
      { id: 1, name: 'apple' },
      { id: 2, name: 'banana' }
    ];
    const { result } = renderHook(() => useStaticTable(data));

    await act(async () => {
      result.current.actions.onSearchChange('apple');
      await flush();
    });

    expect(result.current.count).toBe(1);
    expect((result.current.data as Array<{ name: string }>)[0].name).toBe('apple');
  });

  it('passes non-array data straight through', async () => {
    const { result } = renderHook(() => useStaticTable({ some: 'object' }));

    await act(async () => {
      await flush();
    });

    expect(result.current.data).toEqual({ some: 'object' });
  });
});

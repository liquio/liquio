import { afterEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useStickyState from 'helpers/useStickyState';

afterEach(() => localStorage.clear());

describe('useStickyState', () => {
  it('initializes from localStorage when present, otherwise uses the default', () => {
    localStorage.setItem('key', JSON.stringify('stored'));
    const { result } = renderHook(() => useStickyState('default', 'key'));
    expect(result.current[0]).toBe('stored');

    const fresh = renderHook(() => useStickyState('default', 'other-key'));
    expect(fresh.result.current[0]).toBe('default');
  });

  it('persists updates to localStorage and clears on falsy values', () => {
    const { result } = renderHook(() => useStickyState('value', 'persisted'));

    act(() => result.current[1]('updated'));
    expect(localStorage.getItem('persisted')).toBe(JSON.stringify('updated'));

    act(() => result.current[1](''));
    expect(localStorage.getItem('persisted')).toBeNull();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('store', () => ({ default: { dispatch: vi.fn(), getState: () => ({}) } }));
vi.mock('services/api', () => ({ get: vi.fn(), post: vi.fn().mockResolvedValue({}), del: vi.fn(), put: vi.fn() }));
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({}) }));

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useRegisterTable', () => {
  it('forces strict filtering on top of the caller-supplied filters', async () => {
    const { default: useRegisterTable } = await import('services/dataTable/useRegisterTable');
    const { result } = renderHook(() => useRegisterTable({ filters: { keyId: 1 } }));

    expect(result.current.filters).toEqual({ keyId: 1, strict: true });
  });
});

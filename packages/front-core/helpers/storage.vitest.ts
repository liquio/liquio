import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./configLoader', () => ({ getConfig: vi.fn(() => ({ storageType: undefined })) }));

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('storage', () => {
  it('proxies to localStorage by default', async () => {
    const { default: storage } = await import('helpers/storage');
    storage.setItem('token', 'abc');
    expect(storage.getItem('token')).toBe('abc');
    expect(localStorage.getItem('token')).toBe('abc');
    storage.removeItem('token');
    expect(storage.getItem('token')).toBeNull();
  });

  it('falls back to an in-memory store when storage access throws', async () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('blocked');
    };
    try {
      const { default: storage } = await import('helpers/storage');
      storage.setItem('token', 'abc');
      expect(storage.getItem('token')).toBe('abc');
      expect(localStorage.getItem('token')).toBeNull();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function installFakeIndexedDB() {
  const stores = new Map<string, Map<string, unknown>>();

  function makeRequest<T>(run: () => T) {
    const request: Record<string, unknown> = { result: undefined, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      try {
        request.result = run();
        (request.onsuccess as (() => void) | null)?.();
      } catch {
        (request.onerror as (() => void) | null)?.();
      }
    });
    return request;
  }

  function objectStore(name: string) {
    const data = stores.get(name) as Map<string, unknown>;
    return {
      put: (entry: { key: string; value: unknown }) => makeRequest(() => data.set(entry.key, entry.value)),
      get: (key: string) => makeRequest(() => (data.has(key) ? { key, value: data.get(key) } : undefined)),
      delete: (key: string) => makeRequest(() => data.delete(key)),
      clear: () => makeRequest(() => data.clear()),
      count: () => makeRequest(() => data.size),
      getAllKeys: () => makeRequest(() => Array.from(data.keys()))
    };
  }

  (globalThis as { indexedDB?: unknown }).indexedDB = {
    open: (_dbName: string) => {
      const request: Record<string, unknown> = { onupgradeneeded: null, onsuccess: null, onerror: null };
      queueMicrotask(() => {
        const db = { createObjectStore: (name: string) => stores.set(name, new Map()), transaction: () => ({ objectStore }) };
        (request.onupgradeneeded as ((e: { target: { result: unknown } }) => void) | null)?.({ target: { result: db } });
        (request.onsuccess as ((e: { target: { result: unknown } }) => void) | null)?.({ target: { result: db } });
      });
      return request;
    }
  };
}

beforeEach(installFakeIndexedDB);

afterEach(() => {
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
});

describe('IndexedDBStorage', () => {
  it('stores, reads, and removes values', async () => {
    const { default: storage } = await import('helpers/indexedDB');
    await storage.setItem('a', 1);
    expect(await storage.getItem('a')).toBe(1);
    await storage.removeItem('a');
    expect(await storage.getItem('a')).toBeNull();
  });
});

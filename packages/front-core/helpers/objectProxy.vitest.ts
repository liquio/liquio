import { describe, expect, it } from 'vitest';
import ObjectProxy from 'helpers/objectProxy';

describe('ObjectProxy', () => {
  it('returns scalar values directly', () => {
    const proxy = ObjectProxy({ a: 1, b: 'text' });
    expect(proxy.a).toBe(1);
    expect(proxy.b).toBe('text');
  });

  it('wraps missing or nested values so deep access never throws', () => {
    const proxy = ObjectProxy({ nested: { value: 5 } });
    expect((proxy.nested as Record<string, unknown>).value).toBe(5);
    expect((proxy.missing as Record<string, unknown>).deeper).toEqual({});
  });
});

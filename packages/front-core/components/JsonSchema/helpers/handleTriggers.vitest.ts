/* eslint-disable no-template-curly-in-string */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import sha256 from 'js-sha256';
import handleTriggers from './handleTriggers';

vi.mock('./deleteDocumentAttaches', () => ({ default: vi.fn() }));
vi.mock('@sentry/browser', () => ({
  withScope: vi.fn(),
  captureException: vi.fn()
}));

type Data = Record<string, unknown>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// Mirrors the reducer call shape: origin === documentData (the already-updated document).
const run = (
  documentData: Data,
  triggers: unknown[],
  dataPath: string,
  previousDocumentData?: Data,
  indexPath?: string | number
): Data =>
  handleTriggers(
    documentData,
    triggers as Parameters<typeof handleTriggers>[1],
    dataPath,
    undefined,
    documentData[dataPath.split('.')[0]],
    documentData,
    undefined,
    { userId: 'u1' },
    undefined,
    undefined,
    previousDocumentData,
    indexPath
  );

describe('handleTriggers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('fires when the changed path equals the source', () => {
    const data: Data = { s: { a: 2 } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '(v) => v * 2' }], 's.a');
    expect(result).toEqual({ s: { a: 2, b: 4 } });
  });

  it('reads the trigger value from the document at the source path, not from changesData', () => {
    const data: Data = { s: { a: 5 } };
    const result = handleTriggers(
      data,
      [{ source: 's.a', target: 's.b', calculate: '(v) => v' }],
      's.a',
      'ignored-changes',
      data.s,
      data,
      undefined,
      null
    );
    expect((result.s as Data).b).toBe(5);
  });

  it('passes stepData, documentData, parentData and userInfo to calculate', () => {
    const data: Data = { s: { a: 1 } };
    const result = handleTriggers(
      data,
      [
        {
          source: 's.a',
          target: 's.b',
          calculate: '(v, step, doc, parent, user) => [v, step.a, doc.s.a, parent.p, user.userId].join("|")'
        }
      ],
      's.a',
      1,
      data.s,
      data,
      { p: 'P' },
      { userId: 'u1' }
    );
    expect((result.s as Data).b).toBe('1|1|1|P|u1');
  });

  it('does not fire for an unrelated path', () => {
    const data: Data = { s: { a: 2, c: 1 } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '(v) => v * 2' }], 's.c');
    expect((result.s as Data).b).toBeUndefined();
  });

  it('does not fire for a sibling path that shares the source prefix', () => {
    const data: Data = { s: { a: 2, ab: 1 } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '(v) => v * 2' }], 's.ab');
    expect((result.s as Data).b).toBeUndefined();
  });

  it('fires when an ancestor of the source is written (whole step set)', () => {
    const data: Data = { s: { a: 3 } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '(v) => v + 1' }], 's');
    expect((result.s as Data).b).toBe(4);
  });

  it('fires for every array item when the whole array is written', () => {
    const data: Data = { s: { rows: [{ a: 1 }, { a: 2 }, { a: 3 }] } };
    const result = run(
      data,
      [{ source: 's.rows.${index}.a', target: 's.rows.${index}.b', calculate: '(v) => v * 10' }],
      's.rows'
    );
    expect((result.s as Data).rows).toEqual([
      { a: 1, b: 10 },
      { a: 2, b: 20 },
      { a: 3, b: 30 }
    ]);
  });

  it('fires for a single array item when a whole row is written', () => {
    const data: Data = { s: { rows: [{ a: 1 }, { a: 2 }] } };
    const result = run(
      data,
      [{ source: 's.rows.${index}.a', target: 's.rows.${index}.b', calculate: '(v) => v * 10' }],
      's.rows.1'
    );
    expect((result.s as Data).rows).toEqual([{ a: 1 }, { a: 2, b: 20 }]);
  });

  it('expands ${index} only for the changed array item', () => {
    const data: Data = { s: { rows: [{ a: 1 }, { a: 2 }] } };
    const result = run(
      data,
      [{ source: 's.rows.${index}.a', target: 's.rows.${index}.b', calculate: '(v) => v * 10' }],
      's.rows.0.a'
    );
    expect((result.s as Data).rows).toEqual([{ a: 1, b: 10 }, { a: 2 }]);
  });

  it('substitutes source placeholders inside the calculate source', () => {
    const data: Data = { s: { rows: [{ a: 1 }, { a: 7 }] } };
    const result = run(
      data,
      [
        {
          source: 's.rows.${index}.a',
          target: 's.rows.${index}.b',
          calculate: '(v, step, doc) => doc.s.rows[${index}].a + 100'
        }
      ],
      's.rows.1.a'
    );
    expect(((result.s as Data).rows as Data[])[1].b).toBe(107);
  });

  it('fires when a descendant of an object source is written', () => {
    const data: Data = { s: { obj: { x: 1, y: 2 } } };
    const result = run(
      data,
      [{ source: 's.obj', target: 's.sum', calculate: '(v) => v.x + v.y' }],
      's.obj.x'
    );
    expect((result.s as Data).sum).toBe(3);
  });

  it('gives an object source value an extra self key named after the source field', () => {
    const data: Data = { s: { obj: { x: 1 } } };
    const result = run(
      data,
      [{ source: 's.obj', target: 's.keys', calculate: '(v) => Object.keys(v).join(",") + ":" + v.obj.x' }],
      's.obj.x'
    );
    expect((result.s as Data).keys).toBe('x,obj:1');
  });

  it('gives an indexed object source non-enumerable sibling getters and removes them afterwards', () => {
    const data: Data = { s: { map: { 0: { a: 1 }, 1: { a: 2 } } } };
    const result = run(
      data,
      [
        {
          source: 's.map.${index}',
          target: 's.out',
          calculate: '(v) => Object.keys(v).join(",") + "|" + v[1].a + "|" + (v["0"] === v)'
        }
      ],
      's.map.0'
    );
    expect((result.s as Data).out).toBe('a|2|true');
    expect(Object.getOwnPropertyNames(((data.s as Data).map as Data)[0])).toEqual(['a']);
  });

  it('skips the trigger when previousDocumentData has the same source value', () => {
    const data: Data = { s: { a: 3, other: 2 } };
    const previous = { s: { a: 3, other: 1 } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '(v) => v + 1' }], 's', previous);
    expect((result.s as Data).b).toBeUndefined();
  });

  it('fires when previousDocumentData has a different source value', () => {
    const data: Data = { s: { a: 3 } };
    const previous = { s: { a: 2 } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '(v) => v + 1' }], 's', previous);
    expect((result.s as Data).b).toBe(4);
  });

  it('treats undefined, null, empty string, [] and {} source values as equal when comparing with previousDocumentData', () => {
    const data: Data = { s: { a: '', c: {} } };
    const previous = { s: { c: [] } };
    const result = run(
      data,
      [
        { source: 's.a', target: 's.b', calculate: '() => "fired-a"' },
        { source: 's.c', target: 's.d', calculate: '() => "fired-c"' }
      ],
      's',
      previous
    );
    expect((result.s as Data).b).toBeUndefined();
    expect((result.s as Data).d).toBeUndefined();
  });

  it('compares object source values deeply with previousDocumentData', () => {
    const data: Data = { s: { obj: { x: 1 } } };
    const previous = { s: { obj: { x: 1 } } };
    const result = run(data, [{ source: 's.obj', target: 's.out', calculate: '() => "fired"' }], 's.obj.x', previous);
    expect((result.s as Data).out).toBeUndefined();
  });

  it('only recomputes array rows whose source changed when previousDocumentData is given', () => {
    const data: Data = { s: { rows: [{ a: 1 }, { a: 5 }] } };
    const previous = { s: { rows: [{ a: 1 }, { a: 2 }] } };
    const result = run(
      data,
      [{ source: 's.rows.${index}.a', target: 's.rows.${index}.b', calculate: '(v) => v * 10' }],
      's.rows',
      previous
    );
    expect((result.s as Data).rows).toEqual([{ a: 1 }, { a: 5, b: 50 }]);
  });

  it('hashes the result with sha256 when useSha256 is set', () => {
    const data: Data = { s: { a: 'secret' } };
    const result = run(
      data,
      [{ source: 's.a', target: 's.hash', calculate: '(v) => v', useSha256: true }],
      's.a'
    );
    expect((result.s as Data).hash).toBe(sha256('secret'));
  });

  it('writes the result to every target of an array target', () => {
    const data: Data = { s: { a: 1, t1: 'x', t2: 'y' } };
    const result = run(
      data,
      [{ source: 's.a', target: ['s.t1', 's.t2'], calculate: '() => undefined' }],
      's.a'
    );
    expect(result.s).toEqual({ a: 1, t1: undefined, t2: undefined });
  });

  it('fires for any source of an array source', () => {
    const data: Data = { s: { a: 1, c: 2 } };
    const result = run(data, [{ source: ['s.a', 's.c'], target: 's.sum', calculate: '(v, step) => step.a + step.c' }], 's.c');
    expect((result.s as Data).sum).toBe(3);
  });

  it('keeps boolean false and number 0 results', () => {
    const data: Data = { s: { a: 1 } };
    const result = run(
      data,
      [
        { source: 's.a', target: 's.f', calculate: '() => false' },
        { source: 's.a', target: 's.z', calculate: '() => 0' }
      ],
      's.a'
    );
    expect((result.s as Data).f).toBe(false);
    expect((result.s as Data).z).toBe(0);
  });

  it('turns other falsy results into undefined', () => {
    const data: Data = { s: { a: 1, b: 'old' } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '() => ""' }], 's.a');
    expect((result.s as Data).b).toBeUndefined();
  });

  it('accepts a non-function calculate expression', () => {
    const data: Data = { s: { a: 1 } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '"constant"' }], 's.a');
    expect((result.s as Data).b).toBe('constant');
  });

  it('leaves the target untouched when calculate throws', () => {
    const data: Data = { s: { a: 1, b: 'keep' } };
    const result = run(data, [{ source: 's.a', target: 's.b', calculate: '() => { throw new Error("x"); }' }], 's.a');
    expect((result.s as Data).b).toBe('keep');
  });

  it('ignores triggers without calculate, source or target', () => {
    const data: Data = { s: { a: 1 } };
    const before = clone(data);
    const result = run(
      data,
      [
        { source: 's.a', target: 's.b' },
        { target: 's.b', calculate: '() => 1' },
        { source: 's.a', calculate: '() => 1' }
      ],
      's.a'
    );
    expect(result).toEqual(before);
  });

  it('falls back to indexPath for ${index} in the target when the source path has no index', () => {
    const data: Data = { s: { a: 1 } };
    const result = run(data, [{ source: 's.a', target: 's.rows.${index}.b', calculate: '() => "v"' }], 's.a', undefined, 3);
    expect(((result.s as Data).rows as Data)[3]).toEqual({ b: 'v' });
  });

  it('writes to an "undefined" segment when the source path has no index and no indexPath is given', () => {
    const data: Data = { s: { a: 1 } };
    const result = run(data, [{ source: 's.a', target: 's.rows.${index}.b', calculate: '() => "v"' }], 's.a');
    expect((result.s as Data).rows).toEqual({ undefined: { b: 'v' } });
  });

  it('expands a named source placeholder only over numeric keys and leaves it literal in the target', () => {
    const data: Data = { s: { map: { 0: { a: 1 }, key: { a: 2 } } } };
    const result = run(
      data,
      [{ source: 's.map.${key}.a', target: 's.map.${key}.b', calculate: '(v) => v * 10' }],
      's.map'
    );
    // Only the numeric key "0" is expanded (value 1 -> 10); "key" is never visited, and only
    // ${index} is substituted in targets, so the result lands under a literal "${key}" segment.
    expect((result.s as Data).map).toEqual({ 0: { a: 1 }, key: { a: 2 }, '${key}': { b: 10 } });
  });
});

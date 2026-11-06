import { afterEach, describe, expect, it } from 'vitest';
import evaluate, { $, setGlobalFunctions } from 'helpers/evaluate';
import EvaluateError from 'helpers/evaluate/EvaluateError';

describe('evaluate', () => {
  afterEach(() => {
    $.workflow = {};
  });

  it('compiles and runs the given function source with the provided params', () => {
    expect(evaluate('(a, b) => a + b', 1, 2)).toBe(3);
  });

  it('runs an arrow function with a block body and several args', () => {
    expect(evaluate('(a, b, c) => { return [a, b, c].join("-"); }', 'x', 'y', 'z')).toBe('x-y-z');
  });

  it('runs a classic function expression', () => {
    expect(evaluate('function (a) { return a * 2; }', 21)).toBe(42);
  });

  it('runs a named function expression', () => {
    expect(evaluate('function double(a) { return a * 2; }', 4)).toBe(8);
  });

  it('returns the value of a non-function boolean expression', () => {
    expect(evaluate('true')).toBe(true);
  });

  it('returns the value of a non-function number expression', () => {
    expect(evaluate('1 + 2')).toBe(3);
  });

  it('returns the value of a non-function array literal', () => {
    expect(evaluate('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('returns the value of a non-function string literal', () => {
    expect(evaluate('"hello"')).toBe('hello');
  });

  it('exposes moment to the evaluated source', () => {
    expect(evaluate('() => typeof moment')).toBe('function');
  });

  it('exposes helpers to the evaluated source', () => {
    expect(evaluate('() => typeof helpers')).toBe('object');
  });

  it('exposes $ with an empty workflow by default', () => {
    expect(evaluate('() => $.workflow')).toEqual({});
  });

  it('exposes workflow global functions set by setGlobalFunctions', () => {
    setGlobalFunctions({ sum: '(a, b) => a + b' });
    expect(evaluate('(a) => $.workflow.sum(a, 10)', 5)).toBe(15);
  });

  it('skips invalid global functions and keeps valid ones', () => {
    const originalError = console.error;
    console.error = () => undefined;
    setGlobalFunctions({ ok: '() => 1', broken: '() => {' });
    console.error = originalError;
    expect(Object.keys($.workflow)).toEqual(['ok']);
  });

  it('ignores non-object global functions', () => {
    setGlobalFunctions('nope');
    expect($.workflow).toEqual({});
  });

  it('returns an EvaluateError when no function is provided', () => {
    expect(evaluate('')).toBeInstanceOf(EvaluateError);
  });

  it('returns an EvaluateError when the function source throws', () => {
    const result = evaluate('() => { throw new Error("boom"); }');
    expect(result).toBeInstanceOf(EvaluateError);
    expect((result as InstanceType<typeof EvaluateError>).message).toBe('boom');
  });

  it('returns an EvaluateError when the source does not parse', () => {
    expect(evaluate('(a) => {')).toBeInstanceOf(EvaluateError);
  });

  it('returns an EvaluateError when a non-function expression references an unknown identifier', () => {
    expect(evaluate('unknownIdentifier')).toBeInstanceOf(EvaluateError);
  });
});

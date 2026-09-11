import { describe, expect, it } from 'vitest';
import evaluate from 'helpers/evaluate';
import EvaluateError from 'helpers/evaluate/EvaluateError';

describe('evaluate', () => {
  it('compiles and runs the given function source with the provided params', () => {
    expect(evaluate('(a, b) => a + b', 1, 2)).toBe(3);
  });

  it('returns an EvaluateError when no function is provided', () => {
    expect(evaluate('')).toBeInstanceOf(EvaluateError);
  });

  it('returns an EvaluateError when the function source throws', () => {
    const result = evaluate('() => { throw new Error("boom"); }');
    expect(result).toBeInstanceOf(EvaluateError);
    expect((result as InstanceType<typeof EvaluateError>).message).toBe('boom');
  });
});

import { cutLongStrings } from './cutLongStrings';

describe('cutLongStrings', () => {
  it('returns short strings unchanged', () => {
    expect(cutLongStrings('short', 80)).toBe('short');
  });

  it('truncates long strings and appends an ellipsis', () => {
    const input = 'a'.repeat(100);

    const result = cutLongStrings(input, 20) as string;

    expect(result).toHaveLength(20);
    expect(result.endsWith('...')).toBe(true);
  });

  it('parses a JSON string before truncating', () => {
    const input = JSON.stringify({ foo: 'a'.repeat(100) });

    const result = cutLongStrings(input, 40) as Record<string, unknown>;

    expect(JSON.stringify(result).length).toBeLessThanOrEqual(40);
  });

  it('returns small objects unchanged', () => {
    const input = { foo: 'bar' };

    expect(cutLongStrings(input, 80)).toEqual(input);
  });

  it('truncates long string values nested in an object', () => {
    const input = { foo: 'a'.repeat(2000), bar: 'b'.repeat(2000) };

    const result = cutLongStrings(input, 200) as Record<string, unknown>;

    expect(JSON.stringify(result).length).toBeLessThanOrEqual(200);
  });

  it('falls back to a hard substring cut when field-level truncation is not enough', () => {
    const input = { a: 'x'.repeat(50), b: 'y'.repeat(50), c: 'z'.repeat(50) };

    const result = cutLongStrings(input, 30);

    expect(typeof result).toBe('string');
    expect((result as string).length).toBeLessThanOrEqual(30);
  });

  it('does not mutate the original object', () => {
    const input = { foo: 'a'.repeat(2000) };
    const inputCopy = JSON.parse(JSON.stringify(input));

    cutLongStrings(input, 50);

    expect(input).toEqual(inputCopy);
  });
});

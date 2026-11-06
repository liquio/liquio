import { describe, expect, it } from 'vitest';
import isHTML from 'helpers/isHTML';

describe('isHTML', () => {
  it('detects markup', () => {
    expect(isHTML('<p>hello</p>')).toBe(true);
  });

  it('rejects plain text', () => {
    expect(isHTML('hello')).toBe(false);
  });
});

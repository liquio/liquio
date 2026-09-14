import { describe, expect, it } from 'vitest';
import normalizeClaim from 'helpers/normalizeClaim';

describe('normalizeClaim', () => {
  it('parses digitalDocumentData when it is a JSON string', () => {
    expect(normalizeClaim({ digitalDocumentData: '{"a":1}' })).toEqual({ digitalDocumentData: { a: 1 } });
  });

  it('leaves an unparsable value as-is', () => {
    expect(normalizeClaim({ digitalDocumentData: 'not json' })).toEqual({ digitalDocumentData: 'not json' });
  });

  it('passes claims without digitalDocumentData through unchanged', () => {
    expect(normalizeClaim({ id: 1 })).toEqual({ id: 1 });
  });
});

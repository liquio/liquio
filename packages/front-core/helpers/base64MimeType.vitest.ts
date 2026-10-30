import { describe, expect, it } from 'vitest';
import detectMimeType, { detectImageType } from 'helpers/base64MimeType';

describe('detectImageType', () => {
  it('maps the first base64 character to an image extension', () => {
    expect(detectImageType('/9j/')).toBe('jpg');
    expect(detectImageType('iVBOR')).toBe('png');
    expect(detectImageType('R0lGO')).toBe('gif');
    expect(detectImageType('UklGR')).toBe('webp');
    expect(detectImageType('x')).toBe('jpg');
  });
});

describe('detectMimeType (default)', () => {
  it('extracts the mime type from a data URL', () => {
    expect(detectMimeType('data:image/png;base64,abc==')).toBe('image/png');
  });

  it('returns null for non-string or non-matching input', () => {
    expect(detectMimeType(123)).toBeNull();
    expect(detectMimeType('not a data url')).toBeNull();
  });
});

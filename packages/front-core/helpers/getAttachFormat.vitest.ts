import { describe, expect, it } from 'vitest';
import getAttachFormat from 'helpers/getAttachFormat';

describe('getAttachFormat', () => {
  it('classifies common mime types', () => {
    expect(getAttachFormat({ type: 'image/png' })).toBe('image');
    expect(getAttachFormat({ type: 'application/pdf' })).toBe('pdf');
    expect(getAttachFormat({ type: 'video/mp4' })).toBe('video');
    expect(getAttachFormat({ type: 'text/html' })).toBe('html');
  });

  it('treats octet-stream as pdf only when the content hints at PDF', () => {
    expect(getAttachFormat({ type: 'application/octet-stream', size: 10 }, 'has PDF marker')).toBe('pdf');
    expect(getAttachFormat({ type: 'application/octet-stream', size: 10 }, '')).toBe('binary');
  });

  it('defaults to text when there is no file, unknown otherwise', () => {
    expect(getAttachFormat(null)).toBe('text');
    expect(getAttachFormat({ type: 'application/zip' })).toBe('unknown');
  });
});

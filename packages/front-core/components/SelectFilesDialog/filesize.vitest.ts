import { describe, expect, it } from 'vitest';
import filesize from 'filesize';

// Same default import and zero-option call as SelectFilesDialogContent uses
// to render the file size, so a filesize upgrade that changes the export
// shape or the default units is caught here.
describe('filesize as used by SelectFilesDialogContent', () => {
  it.each([
    [0, '0 B'],
    [500, '500 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [5 * 1024 * 1024, '5 MB']
  ])('formats %i bytes as "%s"', (size, expected) => {
    expect(filesize(size)).toBe(expected);
  });
});

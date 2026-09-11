import { describe, expect, it, vi } from 'vitest';
import downloadFile from 'helpers/downloadFile';

describe('downloadFile', () => {
  it('triggers a download of the given text via a temporary anchor', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadFile('note.txt', 'hello');
    expect(click).toHaveBeenCalled();
    expect(document.body.querySelector('a[download="note.txt"]')).toBeNull();
    click.mockRestore();
  });
});

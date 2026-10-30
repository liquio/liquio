import { describe, expect, it, vi } from 'vitest';
import downloadBase64Attach from 'helpers/downloadBase64Attach';

describe('downloadBase64Attach', () => {
  it('does nothing without a blob', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBase64Attach({ fileName: 'a.txt' }, null);
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it('creates a download link for a plain-text blob', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBase64Attach({ fileName: 'a.txt' }, new Blob(['hi']));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});

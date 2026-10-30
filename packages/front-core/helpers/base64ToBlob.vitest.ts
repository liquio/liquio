import { describe, expect, it } from 'vitest';
import base64ToBlob from 'helpers/base64ToBlob';

const readAsText = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });

describe('base64ToBlob', () => {
  it('decodes a data URI into a blob with the given content type', async () => {
    const blob = base64ToBlob(`data:text/plain;base64,${window.btoa('hello')}`, 'text/plain');
    expect(blob.type).toBe('text/plain');
    expect(await readAsText(blob)).toBe('hello');
  });
});

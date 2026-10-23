import { describe, expect, it, vi } from 'vitest';

vi.mock('compressorjs', () => ({
  default: class {
    constructor(_file: unknown, options: { success: (file: unknown) => void }) {
      options.success('compressed');
    }
  }
}));

describe('compressImage', () => {
  it('resolves with the compressed result', async () => {
    const { default: compressImage } = await import('helpers/compressImage');
    const result = await compressImage({ attach: new Blob(['data']), outputQuality: 0.8 });
    expect(result).toBe('compressed');
  });
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('pdfjs-dist/build/pdf', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({ promise: Promise.resolve({ numPages: 0 }) })
}));

describe('compressPDF', () => {
  it('resolves with the original file when the PDF has no pages', async () => {
    const { default: compressPDF } = await import('helpers/compressPDF');
    const file = new File(['pdf-bytes'], 'a.pdf', { type: 'application/pdf' });
    const result = await compressPDF({ attach: file, outputQuality: 0.5 });
    expect(result).toBe(file);
  });
});

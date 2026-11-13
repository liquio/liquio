import { Response } from 'supertest';

export function expectPdf(res: Response) {
  expect(res.status).toBe(201);
  expect(res.headers['content-type']).toContain('application/pdf');
  expect(Buffer.from(res.body).subarray(0, 5).toString()).toBe('%PDF-');
}

/** Returns the first /MediaBox [x0 y0 x1 y1] of the PDF as [width, height]. */
export function mediaBox(res: Response): [number, number] | null {
  const match = Buffer.from(res.body)
    .toString('latin1')
    .match(/\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*\]/);
  return match ? [Math.round(Number(match[1])), Math.round(Number(match[2]))] : null;
}

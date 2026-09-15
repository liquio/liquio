import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Mime from 'core/components/Mime';

describe('Mime', () => {
  it('joins two types with the translated OR separator', () => {
    const { container } = render(<Mime>{'application/pdf,image/png'}</Mime>);
    expect(container.textContent).toBe('MimeType.application/pdfMimeType.ORMimeType.image/png');
  });

  it('deduplicates repeated types and joins with a comma when there are more than two', () => {
    const { container } = render(<Mime>{'a,a,b,c'}</Mime>);
    expect(container.textContent).toBe('MimeType.a, MimeType.b, MimeType.c');
  });
});

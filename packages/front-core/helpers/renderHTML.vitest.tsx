import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import renderHtml from 'helpers/renderHTML';

describe('renderHtml', () => {
  it('renders allowed tags as React elements', () => {
    const { container } = render(<>{renderHtml('<p>Hello <b>world</b></p>')}</>);
    expect(container.querySelector('b')?.textContent).toBe('world');
  });

  it('strips disallowed tags such as script', () => {
    const { container } = render(<>{renderHtml('<script>alert(1)</script><p>safe</p>')}</>);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('safe');
  });

  it('handles empty input', () => {
    const { container } = render(<>{renderHtml('')}</>);
    expect(container.textContent).toBe('');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HighlightText from 'core/components/HighlightText';

describe('HighlightText', () => {
  it('highlights matching words without changing their case or surrounding text', () => {
    const { container } = render(<HighlightText text="Hello WORLD, hello again" highlight="hello" />);
    expect(container.textContent).toBe('Hello WORLD, hello again');
    expect(Array.from(container.querySelectorAll('b'), (node) => node.textContent)).toEqual(['Hello', 'hello']);
  });

  it('renders plain text when no highlight is provided', () => {
    const { container } = render(<HighlightText text="Unchanged text" />);
    expect(screen.getByText('Unchanged text')).toBeTruthy();
    expect(container.querySelector('b')).toBeNull();
  });
});

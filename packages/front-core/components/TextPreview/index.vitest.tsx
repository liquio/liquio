import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TextPreview from 'core/components/TextPreview';

describe('TextPreview', () => {
  it('translates the well-known "file not found" message', () => {
    render(<TextPreview text="404 File not found" />);
    expect(screen.getByText('Attach.404')).toBeTruthy();
  });

  it('translates the well-known "no access" message', () => {
    render(<TextPreview text="Can't find document or user don't have needed access." />);
    expect(screen.getByText('Attach.NEED_ACCESS')).toBeTruthy();
  });

  it('renders other text unchanged', () => {
    render(<TextPreview text="just some text" />);
    expect(screen.getByText('just some text')).toBeTruthy();
  });
});

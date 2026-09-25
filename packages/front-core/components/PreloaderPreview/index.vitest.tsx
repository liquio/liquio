import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PreloaderPreview from 'core/components/PreloaderPreview';

describe('PreloaderPreview', () => {
  it('renders a nested preview frame containing the Preloader spinner', () => {
    const { container } = render(<PreloaderPreview />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

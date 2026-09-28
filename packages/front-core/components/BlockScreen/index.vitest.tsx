import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BlockScreen from 'core/components/BlockScreen';

describe('BlockScreen', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<BlockScreen open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a dialog with the preloader when open', () => {
    render(<BlockScreen open={true} />);
    expect(document.querySelector('.MuiDialog-root')).not.toBeNull();
  });
});

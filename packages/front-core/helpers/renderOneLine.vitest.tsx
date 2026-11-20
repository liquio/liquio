import React from 'react';
import { describe, expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import RenderOneLine from 'helpers/renderOneLine';

const renderConnected = (ui: React.ReactElement) => renderWithTheme(<Provider store={createStore(() => ({}))}>{ui}</Provider>);

describe('RenderOneLine', () => {
  it('renders the given title text', () => {
    const { container } = renderConnected(<RenderOneLine title="Hello world" />);
    expect(container.textContent).toContain('Hello world');
  });

  it('renders without a title', () => {
    const { container } = renderConnected(<RenderOneLine />);
    expect(container.querySelector('div')).not.toBeNull();
  });
});

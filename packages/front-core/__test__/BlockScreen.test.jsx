import React from 'react';
import { render } from '@testing-library/react';

import BlockScreen from 'components/BlockScreen/index.jsx';
import MockTheme from './../__mocks__/MockTheme.js';

// Renders Dialog component when open is true
it('should render Dialog component when open is true', () => {
  const { getByRole } = render(
    <MockTheme>
      <BlockScreen
        classes={{ dialog: '', dialogPaper: '' }}
        open={true}
        transparentBackground={false}
      />
    </MockTheme>
  );
  expect(getByRole('dialog')).toBeInTheDocument();
});

// Handles missing classes prop gracefully
it('should handle missing classes prop gracefully', () => {
  const { queryByRole } = render(
    <MockTheme>
      <BlockScreen open={true} transparentBackground={false} />
    </MockTheme>
  );
  expect(queryByRole('dialog')).toBeInTheDocument();
});

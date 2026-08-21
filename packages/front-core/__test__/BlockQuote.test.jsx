import React from 'react';
import { render } from '@testing-library/react';

import BlockQuote from 'components/BlockQuote/index.jsx';
import MockTheme from './../__mocks__/MockTheme.js';

it('renders without crashing', () => {
  render(
    <MockTheme>
      <BlockQuote />
    </MockTheme>
  );
});

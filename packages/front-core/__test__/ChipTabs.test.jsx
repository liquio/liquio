import React from 'react';
import { render } from '@testing-library/react';

import ChipTabs from 'components/ChipTabs/index.jsx';
import MockTheme from './../__mocks__/MockTheme.js';

// Renders tabs correctly based on the provided `tabs` prop
it('should render tabs correctly when provided with `tabs` prop', () => {
  const tabs = [
    { title: 'Tab 1', hidden: false, showWarning: false },
    { title: 'Tab 2', hidden: false, showWarning: true }
  ];
  const { getByText } = render(
    <MockTheme>
      <ChipTabs
        classes={{}}
        activeIndex={0}
        onChange={() => {}}
        tabs={tabs}
        readOnly={false}
        errored={[]}
        orientation="horizontal"
        position="left"
        darkTheme={false}
        variant="default"
        nativeStyle={false}
        activeTabStyle=""
        rootDocument={{ data: {} }}
      />
    </MockTheme>
  );
  expect(getByText('Tab 1')).toBeInTheDocument();
  expect(getByText('Tab 2')).toBeInTheDocument();
});

// Handles empty `tabs` array without errors
it('should handle empty `tabs` array without errors', () => {
  const { container } = render(
    <MockTheme>
      <ChipTabs
        classes={{}}
        activeIndex={0}
        onChange={() => {}}
        tabs={[]}
        readOnly={false}
        errored={[]}
        orientation="horizontal"
        position="left"
        darkTheme={false}
        variant="default"
        nativeStyle={false}
        activeTabStyle=""
        rootDocument={{ data: {} }}
      />
    </MockTheme>
  );
  expect(container.querySelectorAll('.MuiTab-root').length).toBe(0);
});

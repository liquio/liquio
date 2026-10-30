import React from 'react';
import { render } from '@testing-library/react';

import GeojsonMap from 'components/JsonSchema/elements/GeojsonMap/index.js';
import MockTheme from './../__mocks__/MockTheme.js';

it('should render map with default zoom and position', () => {
  const { getByText } = render(
    <MockTheme>
      <GeojsonMap
        position={[51.505, -0.09]}
        zoom={10}
        dataPath=""
        rootDocument={{ data: {} }}
        fieldsToDisplay={[]}
        onChange={jest.fn()}
        value={null}
        description=""
        sample=""
        required={false}
        error={null}
        hidden={false}
        checkPlaceActive={null}
        disableLayer={null}
        maxWidth={null}
      />
    </MockTheme>
  );

  const mapElement = getByText('Map mock rendered');
  expect(mapElement).toBeInTheDocument();
});

it('should handle null or undefined dataPath gracefully', () => {
  const { getByText } = render(
    <MockTheme>
      <GeojsonMap
        position={[51.505, -0.09]}
        zoom={10}
        dataPath={null}
        rootDocument={{ data: {} }}
        fieldsToDisplay={[]}
        onChange={jest.fn()}
        value={null}
        description=""
        sample=""
        required={false}
        error={null}
        hidden={false}
        checkPlaceActive={null}
        disableLayer={null}
        maxWidth={null}
      />
    </MockTheme>
  );

  const mapElement = getByText('Map mock rendered');
  expect(mapElement).toBeInTheDocument();
});

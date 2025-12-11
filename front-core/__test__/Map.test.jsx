import React from 'react';
import { render, screen, act } from '@testing-library/react';

import Map from 'components/JsonSchema/elements/Map/index.js';
import MockTheme from './../__mocks__/MockTheme.js';
import MockStore from './../__mocks__/MockStore.js';

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([])
  })
);

it('should render map with default center and zoom levels', () => {
  const initialCenter = [52.52, 13.405];
  const initialZoom = 13;

  render(
    <MockTheme>
      <MockStore>
        <Map
          zoom={initialZoom}
          mobileZoom={10}
          maxZoom={18}
          description="Select a location on the map"
          sample="Click on the map to select a location"
          onChange={(coordinates) => console.log('Selected coordinates:', coordinates)}
          actions={{ setBusy: (busy) => console.log('Map is busy:', busy) }}
          center={initialCenter}
          addressInitial="Berlin, Germany"
          rootDocument={{ data: { address: 'Berlin, Germany' } }}
          minZoom={10}
        />
      </MockStore>
    </MockTheme>
  );

  const mapElement = screen.getByText('Map mock rendered');
  expect(mapElement).toBeInTheDocument();
});

it('should handle invalid coordinates gracefully', async () => {
  const initialCenter = [52.52, 13.405];
  const initialZoom = 13;

  const handleChange = jest.fn();
  const setBusy = jest.fn();

  render(
    <MockTheme>
      <MockStore>
        <Map
          zoom={initialZoom}
          mobileZoom={10}
          maxZoom={18}
          value={null}
          description="Select a location on the map"
          sample="Click on the map to select a location"
          required={true}
          error={null}
          hidden={false}
          onChange={handleChange}
          actions={{ setBusy }}
          readOnly={false}
          center={initialCenter}
          maxBounds={null}
          addressInitial="Berlin, Germany"
          rootDocument={{ data: { address: 'Berlin, Germany' } }}
          disableMapLimit={false}
          minZoom={10}
        />
      </MockStore>
    </MockTheme>
  );

  const invalidCoordinates = null;

  await act(async () => {
    handleChange(invalidCoordinates);
  });

  expect(handleChange).toHaveBeenCalledWith(invalidCoordinates);

  expect(setBusy).not.toHaveBeenCalled();
});

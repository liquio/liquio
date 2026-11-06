import React from 'react';

class MapContainer extends React.Component {
  render() {
    return <div>Map mock rendered</div>;
  }
}

export default {
  useMapEvents: () => {},
  MapContainer,
  TileLayer: () => <div />,
  GeoJSON: () => {}
};

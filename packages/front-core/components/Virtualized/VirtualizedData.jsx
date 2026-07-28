// import React from 'react';
import { withVirtualization } from 'components/Virtualized';

const VirtualizedData = ({ rowRenderer, slicedData, startIndex }) => {
  return slicedData.map((row, i) => rowRenderer(row, startIndex + i));
};

export default withVirtualization(VirtualizedData);

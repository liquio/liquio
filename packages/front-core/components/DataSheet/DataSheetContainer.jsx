import React from 'react';

const DataSheetContainer = ({
  headerHeight,
  dataListHeight,
  height,
  children,
  data,
  virtualizeRef
}) => {
  const [calcHeight, setCalcHeight] = React.useState(height);
  const { averageRowHeight } = virtualizeRef || {};

  React.useEffect(() => {
    const bodyHeight = Math.max(dataListHeight || 0, data.length * (averageRowHeight || 33)) + 33;

    const newHeight =
      typeof height === 'number' ? Math.min(bodyHeight + headerHeight + 1, height) : height;
    if (calcHeight !== newHeight) {
      setCalcHeight(newHeight);
    }
  }, [headerHeight, dataListHeight, height, data, averageRowHeight, calcHeight]);

  return <div style={{ height: calcHeight }}>{children}</div>;
};

export default DataSheetContainer;

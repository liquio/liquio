import React from 'react';
import { detect } from 'detect-browser';
import withStyles from '@mui/styles/withStyles';
import customPassword from 'helpers/customPassword';

import diff from 'helpers/diff';
import waiter from 'helpers/waitForAction';

const { name: browserName } = detect();
const { Provider, Consumer } = React.createContext();

const styles = {
  root: {
    display: 'flex',
    width: 'fit-content',
    maxWidth: '100%',
  },
  content: {
    maxWidth: 'calc(100% - 14px)',
  },
  scroll: {
    width: 14,
    overflowY: 'auto',
    overflowX: 'hidden',
    '& .ps__rail-y': {
      opacity: 1,
    },
  },
};

const Virtualized = ({
  classes,
  height,
  rowHeight = 33,
  fixedRowHeight,
  headerHeight = 0,
  children,
  data,
  selected,
  setFocusToSelected,
  dataListRef,
  dataListHeight,
  jumpTo,
  setJumpTo,
  virtualizeRef,
}) => {
  const [componentId] = React.useState(customPassword());

  const contentRef = React.useRef();
  const scrollRef = React.useRef();

  const [scrollTop, setScrollTop] = React.useState(0);
  const [rowHeights, setRowHeights] = React.useState({});
  const [topElementIndex, setTopElementIndex] = React.useState(0);
  const [bottomElementIndex, setBottomElementIndex] = React.useState(0);

  const [scrollHeight, setScrollHeight] = React.useState(0);
  const [averageRowHeight, setAverageRowHeight] = React.useState(
    fixedRowHeight || 0,
  );

  const [slicedData, setSlicedData] = React.useState([]);

  React.useEffect(() => {
    const newSlicedData = data.slice(topElementIndex, bottomElementIndex);

    if (diff(newSlicedData, slicedData)) {
      setSlicedData(newSlicedData);
    }
  }, [data, topElementIndex, bottomElementIndex, slicedData]);

  const getRowIndexAt = React.useCallback(
    (top, averageRowHeight) => {
      if (fixedRowHeight) {
        return Math.floor(top / fixedRowHeight);
      }

      let height = 0;
      let index = 0;

      while (height < top) {
        height += rowHeights[index] || averageRowHeight;

        index++;
      }

      return index;
    },
    [rowHeights, fixedRowHeight],
  );

  const getBottomRowIndexAt = React.useCallback(
    (topIndex = 0, contHeight, averageRowHeight) => {
      if (fixedRowHeight) {
        return topIndex + Math.floor(contHeight / fixedRowHeight);
      }

      let height = 0;
      let index = topIndex;

      while (height + (rowHeights[index] || averageRowHeight) <= contHeight) {
        height += rowHeights[index] || averageRowHeight;

        index++;
      }

      return index;
    },
    [rowHeights, fixedRowHeight],
  );

  const getRowPosition = React.useCallback(
    (rowIndex, averageRowHeight) => {
      if (fixedRowHeight) {
        return rowIndex * fixedRowHeight;
      }

      let height = 0;
      let index = 0;

      while (index <= rowIndex) {
        height += rowHeights[index] || averageRowHeight;

        index++;
      }

      return height;
    },
    [rowHeights, fixedRowHeight],
  );

  React.useEffect(() => {
    waiter.addAction(
      'updateVirtualized' + componentId,
      () => {
        let newAverageRowHeight = fixedRowHeight || rowHeight;

        if (!fixedRowHeight) {
          const heightValues = Object.values(rowHeights);
          if (heightValues.length) {
            newAverageRowHeight =
              heightValues.reduce((acc, h) => acc + h, 0) / heightValues.length;
          }
        }

        let newTopElementIndex = getRowIndexAt(scrollTop, newAverageRowHeight);

        let newBottomElementIndex = Math.max(
          getBottomRowIndexAt(
            newTopElementIndex,
            height - headerHeight,
            newAverageRowHeight,
          ),
          newTopElementIndex + 1,
        );

        // const showRowCount = newBottomElementIndex - newTopElementIndex;

        if (newBottomElementIndex >= data.length) {
          newBottomElementIndex = data.length;
          // newTopElementIndex = Math.max(newBottomElementIndex - showRowCount, 0);
        }

        const newScrollHeight = parseInt(
          (data.length + 1) * newAverageRowHeight,
          10,
        );

        if (averageRowHeight !== newAverageRowHeight) {
          setAverageRowHeight(newAverageRowHeight);
        }

        if (topElementIndex !== newTopElementIndex) {
          setTopElementIndex(newTopElementIndex);
        }

        if (bottomElementIndex !== newBottomElementIndex) {
          setBottomElementIndex(newBottomElementIndex);
        }

        if (scrollHeight !== newScrollHeight) {
          setScrollHeight(newScrollHeight);
        }
      },
      100,
    );
  }, [
    averageRowHeight,
    bottomElementIndex,
    componentId,
    fixedRowHeight,
    getBottomRowIndexAt,
    scrollHeight,
    topElementIndex,
    data.length,
    rowHeights,
    getRowIndexAt,
    headerHeight,
    height,
    rowHeight,
    scrollTop,
    dataListHeight,
  ]);

  React.useEffect(() => {
    const wheelFunction = (event) => {
      if (!scrollRef.current) {
        return;
      }

      const scrollContainer = scrollRef.current;
      const { scrollTop: st, offsetHeight, scrollHeight: sh } = scrollContainer;

      if (event.deltaY > 0 && sh - offsetHeight === st) {
        return;
      }

      if (event.deltaY < 0 && st === 0) {
        return;
      }

      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const wheelDelta =
          browserName === 'firefox' ? event.deltaY * 10 : event.deltaY;
        scrollContainer.scrollTop += wheelDelta;
      }
    };

    const contentContainer = contentRef.current;

    if (contentContainer) {
      contentContainer.addEventListener('wheel', wheelFunction, false);
      return () => {
        contentContainer.removeEventListener('wheel', wheelFunction, false);
      };
    }
  });

  React.useEffect(() => {
    if (!jumpTo) {
      return;
    }

    const scrollContainer = scrollRef.current;
    scrollContainer.scrollTop = getRowPosition(
      parseInt(jumpTo.rowId, 10) - 1,
      averageRowHeight,
    );
    setJumpTo(null);
  }, [jumpTo, setJumpTo, averageRowHeight, getRowPosition]);

  React.useEffect(() => {
    const scrollContainer = scrollRef.current;

    if (selected.i < topElementIndex) {
      scrollContainer.scrollTop = getRowPosition(
        selected.i - 1,
        averageRowHeight,
      );
      setFocusToSelected();
    }
    if (selected.i >= bottomElementIndex) {
      scrollContainer.scrollTop = getRowPosition(
        selected.i + topElementIndex - bottomElementIndex,
        averageRowHeight,
      );
      setFocusToSelected();
    }
  }, [selected.i]);

  React.useEffect(() => {
    if (dataListRef.current && !fixedRowHeight) {
      const list = [...dataListRef.current.getElementsByTagName('tr')];

      let newRowHeights = list.reduce(
        (acc, row, index) => ({
          ...acc,
          [index + topElementIndex]: row.clientHeight,
        }),
        rowHeights,
      );

      newRowHeights = Object.keys(newRowHeights)
        .filter((key) => key < data.length)
        .reduce((acc, key) => ({ ...acc, [key]: newRowHeights[key] }), {});

      if (diff(rowHeights || {}, newRowHeights || {})) {
        waiter.addAction(
          'setRowHeights' + componentId,
          () => {
            setRowHeights(newRowHeights);
          },
          50,
        );
        return;
      }
    }
  }, [
    height,
    data.length,
    dataListRef,
    rowHeights,
    topElementIndex,
    componentId,
    fixedRowHeight,
  ]);

  const providerValue = React.useMemo(
    () => ({
      contentHeight: height,
      scrollTop,
      scrollHeight,
      slicedData,
      headerHeight,
      startIndex: topElementIndex,
      averageRowHeight,
    }),
    [
      height,
      scrollTop,
      scrollHeight,
      slicedData,
      headerHeight,
      topElementIndex,
      averageRowHeight,
    ],
  );

  if (virtualizeRef && typeof virtualizeRef === 'function') {
    virtualizeRef(providerValue);
  }

  return (
    <Provider value={providerValue}>
      <div ref={contentRef} className={classes.root} style={{ height }}>
        <div className={classes.content}>{children}</div>
        <div
          ref={scrollRef}
          className={classes.scroll}
          style={{ height: height - headerHeight }}
          onScroll={(e) => setScrollTop(e?.target?.scrollTop)}
        >
          <div style={{ width: 1, height: scrollHeight }} />
        </div>
      </div>
    </Provider>
  );
};

const withVirtualization = (Component) => (props) => (
  <Consumer>{(context) => <Component {...props} {...context} />}</Consumer>
);

export { withVirtualization };
export default withStyles(styles)(Virtualized);

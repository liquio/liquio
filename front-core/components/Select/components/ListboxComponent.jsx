/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { VariableSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { makeStyles } from '@mui/styles';
import ProgressLine from 'components/Preloader/ProgressLine';
import theme from 'theme';
import MobileDetect from 'mobile-detect';

const useStyles = makeStyles(() => ({
  refWrapper: {
    overflow: 'hidden',
  },
}));

const md = new MobileDetect(window.navigator.userAgent);
const isMobile = !!md.mobile();

const LISTBOX_PADDING = 6;
const FULL_WIDTH = 640;
const LINE_HEIGHT = isMobile ? 16 : 20;
const UPPERCASE_INFLUENCE = 16;

const renderRow = (props) => {
  const { data, index, style } = props;
  return React.cloneElement(data[index], {
    style: {
      ...style,
      top: style.top + LISTBOX_PADDING,
    },
  });
};

const useResetCache = (data) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current != null) {
      ref?.current?.resetAfterIndex(0, true);
    }
  }, [data]);
  return ref;
};

const OuterElementType = React.forwardRef((props, ref) => {
  const outerProps = React.useContext(OuterElementContext);
  return <div ref={ref} {...props} {...outerProps} />;
});

const OuterElementContext = React.createContext({});

const getTextWidth = (text, font) => {
  const canvas =
    getTextWidth.canvas ||
    (getTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  context.font = font;
  context.letterSpacing = '0.5px';
  const metrics = context.measureText(text);
  return metrics.width;
};

const getFont = () => {
  try {
    return theme?.typography?.fontFamily;
  } catch {
    return 'Roboto';
  }
};

const measureTextLines = (text, width, font, lineHeight = LINE_HEIGHT) => {
  let container = document.getElementById('hiddenTextMeasure');

  if (!container) {
    container = document.createElement('div');
    container.id = 'hiddenTextMeasure';
    document.body.appendChild(container);
  }

  Object.assign(container.style, {
    width: `${width}px`,
    font,
    fontSize: '16px',
    fontWeight: '400',
    letterSpacing: '0.5px',
    lineHeight: `${lineHeight}px`,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    wordBreak: 'break-word',
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    visibility: 'hidden',
    padding: '0',
    margin: '0',
    boxSizing: 'border-box',
    zIndex: -1,
    pointerEvents: 'none',
  });

  container.innerText = typeof text === 'string' ? text : String(text);

  const height = container.offsetHeight;
  return Math.max(1, Math.ceil(height / lineHeight));
};

const ListboxComponent = React.forwardRef((props, ref) => {
  const {
    children,
    hasNextPage,
    isLoading,
    containerWidth,
    ...other
  } = props;

  const classes = useStyles();

  const itemData = React.Children.toArray(children);
  const itemCount = itemData.length;

  const itemSize = 40;

  const getChildSize = (child) => {
    const itemWidth = (containerWidth || FULL_WIDTH) - UPPERCASE_INFLUENCE;
    const font = `400 16px ${getFont()}`;
    const lineCount = measureTextLines(child.props.children, itemWidth, font, LINE_HEIGHT);

    if (lineCount < 3) return itemSize;

    if (lineCount >= 6) return itemSize + 7 * LINE_HEIGHT + LISTBOX_PADDING;

    return itemSize + lineCount * LINE_HEIGHT;
  };

  const getHeight = () => {
    if (itemCount > 8) return 8 * itemSize;
    return itemData.map(getChildSize).reduce((a, b) => a + b, 0);
  };

  const gridRef = useResetCache(itemCount);

  const loadMoreItems = () => {};

  const isItemLoaded = (index) => !hasNextPage || index < itemCount;

  return (
    <div ref={ref} className={classes.refWrapper}>
      <OuterElementContext.Provider value={other}>
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={loadMoreItems}
        >
          {({ onItemsRendered }) => (
            <VariableSizeList
              onItemsRendered={onItemsRendered}
              itemData={itemData}
              height={getHeight() + 2 * LISTBOX_PADDING}
              width="100%"
              ref={gridRef}
              outerElementType={OuterElementType}
              innerElementType="div"
              itemSize={(i) => getChildSize(itemData[i])}
              overscanCount={5}
              itemCount={itemCount}
            >
              {renderRow}
            </VariableSizeList>
          )}
        </InfiniteLoader>
        <ProgressLine
          loading={isLoading}
          style={{ position: 'relative', top: -2 }}
        />
      </OuterElementContext.Provider>
      <div
        id="hiddenTextMeasure"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '0',
          height: '0',
          overflow: 'hidden',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </div>
  );
});

ListboxComponent.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
};

export default ListboxComponent;

export { getTextWidth, getFont };

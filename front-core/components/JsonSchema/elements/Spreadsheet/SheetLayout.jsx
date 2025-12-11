import React from 'react';
import classNames from 'classnames';

import withStyles from '@mui/styles/withStyles';
import useStickyState from 'helpers/useStickyState';

import SheetHeader from './SheetHeader';

const styles = {
  scroll: {
    '& .ps__rail-x': {
      opacity: 1,
    },
    overflowY: 'hidden',
    overflowX: 'auto',
    border: 'rgba(0, 0, 0, 0) 1px solid',
  },
  errored: {
    border: '#f9b59c 1px solid',
  },
};

const SheetLayout = ({
  children,
  errors,
  className,
  classes,
  // width, // Currently unused
  stepName,
  path,
  scrollRef,
  dataListRef,
  selecting,
  virtualizeRef,
  fontSize,
  ...rest
}) => {
  const [scrollLeft, setScrollLeft] = useStickyState(
    0,
    [stepName].concat(path, 'spreadsheet').join('-'),
  );

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollRef, scrollLeft]);

  React.useEffect(() => {
    const updateScroll = (e) => {
      if (!e) return;

      const { x: cursorX } = e;
      const scrollContainer = scrollRef && scrollRef.current;
      if (!scrollContainer) return;

      const { x, width: containerWidth } =
        scrollContainer && scrollContainer.getBoundingClientRect();

      if (selecting) {
        let deltaX = 0;

        if (x && cursorX && cursorX < x) {
          deltaX = cursorX - x;
        }

        if (x && cursorX && cursorX > x + containerWidth) {
          deltaX = cursorX - x - containerWidth;
        }

        scrollContainer.scrollLeft += deltaX;
      }
    };

    window.addEventListener('mousemove', updateScroll);
    return () => window.removeEventListener('mousemove', updateScroll);
  });

  return (
    <div
      ref={scrollRef}
      // options={{ suppressScrollY: true }}
      className={classNames(classes.scroll, {
        [classes.errored]: errors && errors.length,
      })}
      onScroll={({ scrollLeft: left }) => setScrollLeft(left)}
      style={{
        height: virtualizeRef?.contentHeight + 2,
      }}
    >
      <table
        className={className}
        style={{ fontSize: fontSize ? fontSize : 16 }}
        role="table"
      >
        <SheetHeader {...rest} />
        <tbody ref={dataListRef}>{children}</tbody>
      </table>
      <div style={{ height: 16 }} />
    </div>
  );
};

export default withStyles(styles)(SheetLayout);

import React from 'react';
import classNames from 'classnames';

import { makeStyles } from '@mui/styles';
import useStickyState from 'helpers/useStickyState';

import SheetHeader from 'components/JsonSchema/elements/DataTable/SheetHeader';

const useStyles = makeStyles({
  scroll: {
    '& .ps__rail-x': {
      opacity: 1,
    },
    overflowY: 'hidden',
    overflowX: 'auto',
    // border: 'rgba(0, 0, 0, 0) 1px solid'
  },
  errored: {
    border: '#f9b59c 1px solid',
  },
});

const SheetLayout = ({
  children,
  errors,
  className,
  stepName,
  path,
  scrollRef,
  dataListRef,
  selecting,
  headers,
  headerRef,
  headAlign,
  editing,
  showRowNumbers,
}) => {
  const classes = useStyles();
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
      if (!e || (editing.i && editing.j)) {
        return;
      }

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
      onScroll={(e) => {
        if (editing.i && editing.j) {
          return;
        }
        setScrollLeft(e.target.scrollLeft);
      }}
    >
      <table className={className}>
        <SheetHeader
          headers={headers}
          headAlign={headAlign}
          headerRef={headerRef}
          showRowNumbers={showRowNumbers}
        />
        <tbody ref={dataListRef}>{children}</tbody>
      </table>
      <div style={{ height: 33 }} />
    </div>
  );
};

export default SheetLayout;

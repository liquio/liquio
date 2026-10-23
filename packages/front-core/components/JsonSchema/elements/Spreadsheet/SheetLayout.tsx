import React from 'react';
import classNames from 'classnames';

import withStyles, { WithStyles } from '@mui/styles/withStyles';
import useStickyState from 'helpers/useStickyState';

import SheetHeader from './SheetHeader';

const styles = {
  scroll: {
    '& .ps__rail-x': {
      opacity: 1,
    },
    overflowY: 'hidden' as const,
    overflowX: 'auto' as const,
    border: 'rgba(0, 0, 0, 0) 1px solid',
  },
  errored: {
    border: '#f9b59c 1px solid',
  },
};

interface SheetLayoutProps extends WithStyles<typeof styles> {
  children?: React.ReactNode;
  errors?: unknown[];
  className?: string;
  stepName?: string;
  path: Array<string | number>;
  scrollRef: React.RefObject<HTMLDivElement>;
  dataListRef: React.RefObject<HTMLTableSectionElement>;
  selecting?: boolean;
  virtualizeRef?: { contentHeight?: number };
  fontSize?: number;
  [key: string]: unknown;
}

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
}: SheetLayoutProps) => {
  const [scrollLeft, setScrollLeft] = useStickyState(
    0,
    ([stepName] as Array<string | number>).concat(path, 'spreadsheet').join('-'),
  );

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft as number;
    }
  }, [scrollRef, scrollLeft]);

  React.useEffect(() => {
    const updateScroll = (e: MouseEvent) => {
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
        [classes.errored]: !!(errors && errors.length),
      })}
      onScroll={({ currentTarget: { scrollLeft: left } }) => setScrollLeft(left)}
      style={{
        height: (virtualizeRef?.contentHeight as number) + 2,
      }}
    >
      <table
        className={className}
        style={{ fontSize: fontSize ? fontSize : 16 }}
        role="table"
      >
        <SheetHeader {...(rest as unknown as { headers: Array<Array<{ label?: React.ReactNode; colspan?: number; rowSpan?: number } | string>>; schema: { showRowNumbers?: boolean } })} />
        <tbody ref={dataListRef}>{children}</tbody>
      </table>
      <div style={{ height: 16 }} />
    </div>
  );
};

export default withStyles(styles)(SheetLayout);

import React, { useRef, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import classNames from 'classnames';
import PerfectScrollbar from 'react-perfect-scrollbar';
import type { ScrollBarProps } from 'react-perfect-scrollbar';
import { useResizeDetector } from 'react-resize-detector';
import withStyles from '@mui/styles/withStyles';
import type { StyleRules, WithStyles } from '@mui/styles/withStyles';
import MobileDetect from 'mobile-detect';

import 'react-perfect-scrollbar/dist/css/styles.css';

const styles = {
  hideDefaultScroll: {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
    scrollbarWidth: 'none',
  },
  containLayout: {},
} satisfies StyleRules;

const md = new MobileDetect(window.navigator.userAgent);

// Everything not listed is spread onto PerfectScrollbar after the explicit props, so it can override them.
interface ScrollbarProps extends WithStyles<typeof styles>, Omit<ScrollBarProps, 'children' | 'classes'> {
  children: ReactNode;
  containLayout?: boolean;
}

const Scrollbar = ({ children, classes, options, containLayout, ...rest }: ScrollbarProps) => {
  const scrollBarRef = useRef<PerfectScrollbar>(null);
  const [isMobile] = useState(!!md.mobile());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onResize = () => scrollBarRef.current && scrollBarRef.current.updateScroll();

  const updateScrollOnSafari = () => {
    const isSafari = (window.navigator.userAgent || '').toLowerCase().indexOf('safari') !== -1 || false;

    if (!isSafari || isMobile) return;

    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => scrollBarRef.current && scrollBarRef.current.updateScroll(), 200);
  };

  const { ref } = useResizeDetector({
    handleHeight: true,
    onResize: onResize,
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <PerfectScrollbar
      className={classNames({
        [classes.hideDefaultScroll]: true,
        [classes.containLayout]: containLayout,
      })}
      ref={scrollBarRef}
      onYReachEnd={updateScrollOnSafari}
      options={{ minScrollbarLength: 50, ...options }}
      {...rest}
    >
      <div ref={ref}>
        {children}
      </div>
    </PerfectScrollbar>
  );
};

const styled = withStyles(styles)(Scrollbar);
export default styled;

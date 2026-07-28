import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useResizeDetector } from 'react-resize-detector';
import withStyles from '@mui/styles/withStyles';
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
};

const md = new MobileDetect(window.navigator.userAgent);

const Scrollbar = ({ children, classes, options, containLayout, ...rest }) => {
  const scrollBarRef = useRef(null);
  const [isMobile] = useState(!!md.mobile());
  const timeoutRef = useRef(null);

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

Scrollbar.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
  classes: PropTypes.object.isRequired,
};
const styled = withStyles(styles)(Scrollbar);
export default styled;

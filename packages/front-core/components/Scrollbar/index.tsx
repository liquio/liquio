/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useResizeDetector } from 'react-resize-detector';
import withStyles from '@mui/styles/withStyles';
import MobileDetect from 'mobile-detect';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { setMainScrollbar } from 'actions/app';

const styles = {
  hideDefaultScroll: {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
    scrollbarWidth: 'none' as const,
  },
};

const md = new MobileDetect(window.navigator.userAgent);

interface ScrollbarProps {
  children: React.ReactNode;
  classes: Record<string, string>;
  options?: Record<string, unknown>;
  actions: { setMainScrollbar: (name: string, ref: unknown) => void };
  saveRef?: string;
  isMainScrollbar?: boolean;
  [key: string]: unknown;
}

// `react-resize-detector` v4's `<ReactResizeDetector>` render-prop component
// (which auto-detected its nearest DOM ancestor via `ReactDOM.findDOMNode`)
// was removed under React 19 — `findDOMNode` no longer exists. Converted
// from a class component to a function component so the replacement
// `useResizeDetector()` hook can be used; its `ref` is wired into
// `PerfectScrollbar`'s own `containerRef` prop (the raw scroll-container
// DOM node it already exposes for exactly this purpose), preserving the
// same "observe the scroll container's own size" behavior as before.
const Scrollbar = ({ children, classes, options, actions, saveRef, isMainScrollbar, ...rest }: ScrollbarProps) => {
  const [isMobile] = React.useState(() => !!md.mobile());
  const scrollBarRef = React.useRef<(PerfectScrollbar & { updateScroll: () => void }) | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onResize = React.useCallback(() => scrollBarRef.current && scrollBarRef.current.updateScroll(), []);

  const { ref: resizeRef } = useResizeDetector({ handleHeight: true, onResize });

  const updateScrollOnSafari = React.useCallback(() => {
    const isSafari =
      (window.navigator.userAgent || '').toLowerCase().indexOf('safari') !==
        -1 || false;

    if (!isSafari || isMobile) return;

    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(
      () => scrollBarRef.current && scrollBarRef.current.updateScroll(),
      200,
    );
  }, [isMobile]);

  React.useEffect(() => {
    if (scrollBarRef.current && isMainScrollbar) {
      actions.setMainScrollbar('mainScrollbar', scrollBarRef.current);
    }

    if (scrollBarRef.current && saveRef) {
      actions.setMainScrollbar(saveRef, scrollBarRef.current);
    }
  }, []);

  return (
    <PerfectScrollbar
      className={classes.hideDefaultScroll}
      ref={(ref: (PerfectScrollbar & { updateScroll: () => void }) | null) => {
        scrollBarRef.current = ref;
      }}
      containerRef={resizeRef}
      onYReachEnd={updateScrollOnSafari}
      options={{ minScrollbarLength: 50, ...options }}
      {...(rest as unknown as Record<string, unknown>)}
    >
      {children}
    </PerfectScrollbar>
  );
};

const mapStateToProps = ({ app: { mainScrollbar } }: { app: { mainScrollbar: unknown } }) => ({ mainScrollbar });
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    setMainScrollbar: bindActionCreators(setMainScrollbar, dispatch),
  },
});

const styled = withStyles(styles)(Scrollbar as never);
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;

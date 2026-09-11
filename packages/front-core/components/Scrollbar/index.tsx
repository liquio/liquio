/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import ReactResizeDetector from 'react-resize-detector';
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

interface ScrollbarState {
  isMobile: boolean;
}

class Scrollbar extends React.Component<ScrollbarProps, ScrollbarState> {
  scrollBarRef: (PerfectScrollbar & { props?: { isMainScrollbar?: boolean } }) | null = null;
  timeout: ReturnType<typeof setTimeout> | undefined;

  constructor(props: ScrollbarProps) {
    super(props);
    this.state = {
      isMobile: !!md.mobile(),
    };
  }

  onResize = () => this.scrollBarRef && this.scrollBarRef.updateScroll();

  updateScrollOnSafari = () => {
    const isSafari =
      (window.navigator.userAgent || '').toLowerCase().indexOf('safari') !==
        -1 || false;
    const { isMobile } = this.state;

    if (!isSafari || isMobile) return;

    clearTimeout(this.timeout);

    this.timeout = setTimeout(
      () => this.scrollBarRef && this.scrollBarRef.updateScroll(),
      200,
    );
  };

  render() {
    const { children, classes, options, ...rest } = this.props;

    return (
      <PerfectScrollbar
        className={classes.hideDefaultScroll}
        ref={(ref) => {
          this.scrollBarRef = ref;
        }}
        onYReachEnd={this.updateScrollOnSafari}
        options={{ minScrollbarLength: 50, ...options }}
        {...(rest as unknown as Record<string, unknown>)}
      >
        {children}
        <ReactResizeDetector handleHeight={true} onResize={this.onResize} />
      </PerfectScrollbar>
    );
  }

  componentDidMount() {
    const { actions, saveRef } = this.props;

    if (this.scrollBarRef && this.scrollBarRef?.props?.isMainScrollbar) {
      actions.setMainScrollbar('mainScrollbar', this.scrollBarRef);
    }

    if (this.scrollBarRef && saveRef) {
      actions.setMainScrollbar(saveRef, this.scrollBarRef);
    }
  }
}

const mapStateToProps = ({ app: { mainScrollbar } }: { app: { mainScrollbar: unknown } }) => ({ mainScrollbar });
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    setMainScrollbar: bindActionCreators(setMainScrollbar, dispatch),
  },
});

const styled = withStyles(styles)(Scrollbar as never);
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;

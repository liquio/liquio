import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Drawer, CssBaseline } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import SplitPane from 'react-split-pane';
import hotkeys from 'hotkeys-js';

import { setOpenSidebar } from 'actions/app';
import { closeError } from 'actions/error';
import { toggleDebugMode } from 'actions/auth';
import Header from 'layouts/components/Header';
import Navigator from 'layouts/components/Navigator';
import DebugTools from 'layouts/components/DebugTools';
import checkAccess from 'helpers/checkAccess';

const styles = (theme) => ({
  root: {
    flex: '0 1 100%',
    display: 'flex',
    overflow: 'hidden',
  },
  sidebarWrapper: {
    flex: '0 1 100%',
    maxWidth: theme.navigator.width,
    zIndex: 10,
  },
  drawerPaper: {
    backgroundColor: theme.navigator.sidebarBg,
    borderRight: theme.navigator.drawerPaper.borderRight,
    position: 'inherit',
  },
  appContent: {
    flex: 1,
    overflowY: 'auto',
    marginLeft: -300,
    transition: 'margin 225ms cubic-bezier(0.0, 0, 0.2, 1) 0ms',
    [theme.breakpoints.up('md')]: {
      display: 'flex',
      flexDirection: 'column',
    },
    [theme.breakpoints.down('sm')]: {
      marginLeft: -250,
    },
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
    overflowX: 'hidden',
    backgroundColor: theme.palette.background.default,
  },
  flexContent: {
    display: 'flex',
    flexDirection: 'column',
  },
});

class Layout extends React.Component {
  constructor(props) {
    super(props);

    const { actions, openSidebar, largeScreenWidth } = this.props;

    if (openSidebar === null) {
      actions.setOpenSidebar(window.innerWidth > largeScreenWidth);
    }
  }

  handleDrawerToggle = () => {
    const { actions, openSidebar } = this.props;
    actions.setOpenSidebar(!openSidebar);
  };

  componentDidMount() {
    const { actions } = this.props;

    window.addEventListener('resize', this.updateWindowDimensions);
    hotkeys('ctrl+x', actions.toggleDebugMode);
  }

  componentWillUnmount() {
    const { actions, openSidebar, largeScreenWidth } = this.props;
    const open = window.innerWidth > largeScreenWidth;

    if (openSidebar && !open) {
      actions.setOpenSidebar(open);
    }

    window.removeEventListener('resize', this.updateWindowDimensions);
    hotkeys.unbind('ctrl+x');
  }

  updateWindowDimensions = () => {
    const { actions, openSidebar, largeScreenWidth } = this.props;
    const open = window.innerWidth > largeScreenWidth;

    if (open !== openSidebar) {
      actions.setOpenSidebar(window.innerWidth > largeScreenWidth);
    }
  };

  renderNavigation() {
    const { classes, location, openSidebar } = this.props;

    return (
      <Drawer
        className={classes.sidebarWrapper}
        variant="persistent"
        open={openSidebar}
        onClose={this.handleDrawerToggle}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <Navigator location={location} />
      </Drawer>
    );
  }

  renderMainPane() {
    const {
      classes,
      title,
      loading,
      children,
      flexContent,
      openSidebar,
      onboardingTaskId,
      backButton,
      errors,
      actions,
      workflowId,
      workflowTags
    } = this.props;

    if (onboardingTaskId) {
      return <div id="main-container">{children}</div>;
    }

    return (
      <>
        <Header
          title={title}
          open={openSidebar}
          loading={loading}
          backButton={backButton}
          errors={errors}
          actions={actions}
          onDrawerToggle={this.handleDrawerToggle}
          workflowId={workflowId}
          workflowTags={workflowTags}
        />
        <main
          id="main-container"
          className={classNames(classes.root, 'root-layout')}
        >
          {this.renderNavigation()}
          <div
            className={classNames(classes.appContent, {
              [classes.contentShift]: openSidebar,
              [classes.flexContent]: flexContent,
            })}
          >
            {children}
          </div>
        </main>
      </>
    );
  }

  renderPanes() {
    const { debugMode, userInfo, userUnits, debugTools } = this.props;

    const debugModeEnabledInUnit = userUnits.find(
      ({ menuConfig }) => menuConfig?.debugMode === true,
    );

    const userIsAdmin = checkAccess({ userIsAdmin: true }, userInfo, userUnits);

    const useDebugPane = debugModeEnabledInUnit && userIsAdmin && debugMode;

    const mainPane = this.renderMainPane();

    if (!useDebugPane) {
      return mainPane;
    }

    return (
      <SplitPane split="horizontal" minSize="calc(100% - 400px)">
        {mainPane}
        <DebugTools debugTools={debugTools} />
      </SplitPane>
    );
  }

  render() {
    return (
      <>
        <CssBaseline />
        {this.renderPanes()}
      </>
    );
  }
}

Layout.propTypes = {
  classes: PropTypes.object.isRequired,
  disableScrolls: PropTypes.bool,
  openSidebar: PropTypes.bool,
  actions: PropTypes.object.isRequired,
  largeScreenWidth: PropTypes.number.isRequired,
};
Layout.defaultProps = {
  disableScrolls: false,
  openSidebar: null,
  largeScreenWidth: 600,
};

const mapStateToProps = ({
  app: { openSidebar },
  errors: { list },
  auth: {
    debugMode,
    userUnits,
    info,
    info: { onboardingTaskId },
  },
}) => ({
  errors: list,
  openSidebar,
  debugMode,
  userUnits,
  userInfo: info,
  onboardingTaskId,
});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    closeError: bindActionCreators(closeError, dispatch),
    setOpenSidebar: bindActionCreators(setOpenSidebar, dispatch),
    toggleDebugMode: bindActionCreators(toggleDebugMode, dispatch),
  },
});

const styled = withStyles(styles)(Layout);

export default connect(mapStateToProps, mapDispatchToProps)(styled);

export { default as Content } from 'layouts/components/Content';
export { default as DrawerContent } from 'layouts/components/DrawerContent';

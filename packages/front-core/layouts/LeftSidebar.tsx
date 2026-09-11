import { CssBaseline, Drawer, Typography } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import hotkeys from 'hotkeys-js';
import React from 'react';
import { connect } from 'react-redux';
import SplitPane from 'react-split-pane';
import { bindActionCreators, Dispatch } from 'redux';

import { setOpenSidebar } from 'actions/app';
import { toggleDebugMode } from 'actions/auth';
import { closeError } from 'actions/error';
import ProgressLine from 'components/Preloader/ProgressLine';
import Scrollbar from 'components/Scrollbar';
import Snackbars from 'components/Snackbars';
import checkAccess from 'helpers/checkAccess';

const SplitPaneAny = SplitPane as unknown as React.ComponentType<Record<string, unknown>>;

const DebugTools = React.lazy(() => import('layouts/components/DebugTools'));
const Navigator = React.lazy(() => import('layouts/components/Navigator'));
const Header = React.lazy(() => import('layouts/components/Header'));
const Breadcrumbs = React.lazy(() => import('components/BreadCrumbs'));

const drawerWidth = window.innerWidth > 510 ? 300 : window.innerWidth;
const LARGE_SCREEN_WIDTH = 600;

type AppTheme = Theme & {
  leftSidebarBg?: string;
  drawerPaper?: Record<string, unknown>;
};

const styles = (theme: AppTheme) => ({
  root: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebarWrapper: {
    width: drawerWidth,
    flexShrink: 0,
    '& .scrollbar-container::-webkit-scrollbar': {
      display: 'none',
    },
    '& .scrollbar-container': {
      scrollbarWidth: 'none',
    },
  },
  drawerPaper: {
    width: drawerWidth,
    backgroundColor: theme.leftSidebarBg,
    position: 'inherit' as const,
    boxSizing: 'content-box' as const,
    ...(theme?.drawerPaper || {}),
  },
  appContent: {
    [theme.breakpoints.up('md')]: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    flex: 1,
    marginLeft: -drawerWidth,
    transition: 'margin 225ms cubic-bezier(0.0, 0, 0.2, 1) 0ms',
    overflowX: 'hidden' as const,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
  toolbar: {
    backgroundColor: theme.leftSidebarBg,
    padding: 6,
  },
  collapseButton: {
    padding: 5,
    minWidth: 5,
  },
  flexContent: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  mainHeadline: {
    marginTop: 32,
    marginLeft: 40,
    marginBottom: 28,
    [theme.breakpoints.down('sm')]: {
      marginLeft: 20,
    },
  },
  fullWidth: {
    width: '100%',
  },
});

interface Unit {
  id?: number;
  menuConfig?: { debugMode?: boolean };
  [key: string]: unknown;
}

interface LayoutProps {
  classes: Record<string, string>;
  location: unknown;
  actions: {
    setOpenSidebar: (open: boolean) => void;
    closeError: (errorIndex?: number) => void;
    toggleDebugMode: () => void;
  };
  openSidebar: boolean | null;
  title?: React.ReactNode;
  noTitle?: boolean;
  children?: React.ReactNode;
  flexContent?: boolean;
  onboardingTaskId?: unknown;
  backButton?: string;
  debugMode?: boolean;
  userInfo?: unknown;
  userUnits: Unit[];
  debugTools?: unknown;
  errors: unknown;
  loading?: boolean;
  breadcrumbs?: unknown[];
}

const Layout = ({
  classes,
  location,
  actions,
  openSidebar,
  title,
  noTitle,
  children,
  flexContent,
  onboardingTaskId,
  backButton,
  debugMode,
  userInfo,
  userUnits,
  debugTools,
  errors,
  loading,
  breadcrumbs,
}: LayoutProps) => {
  const handleDrawerToggle = React.useCallback(() => {
    actions.setOpenSidebar(!openSidebar);
  }, [actions, openSidebar]);

  const renderMainPane = React.useCallback(() => {
    if (onboardingTaskId) {
      return <div id="main-container">{children}</div>;
    }

    return (
      <>
        {noTitle ? null : (
          <Header
            title={undefined}
            open={openSidebar}
            backButton={backButton}
            onDrawerToggle={handleDrawerToggle}
          />
        )}
        <div
          id="main-container"
          className={classNames(classes.root, 'root-layout')}
        >
          <Drawer
            className={classes.sidebarWrapper}
            variant="persistent"
            open={openSidebar as boolean}
            onClose={handleDrawerToggle}
            classes={{
              paper: classes.drawerPaper,
            }}
          >
            <Navigator
              location={location}
              breadcrumbs={breadcrumbs}
              actions={actions}
            />
          </Drawer>
          <div
            className={classNames(classes.appContent, {
              [classes.contentShift]: openSidebar,
              [classes.flexContent]: flexContent,
            })}
          >
            <Scrollbar
              id="scrollbar"
              isMainScrollbar={true}
              options={{ suppressScrollX: true }}
            >
              <Breadcrumbs breadcrumbs={breadcrumbs} />
              <Typography variant="h1" className={classes.mainHeadline}>
                {title}
              </Typography>
              {children}
            </Scrollbar>
          </div>
        </div>
      </>
    );
  }, [
    backButton,
    breadcrumbs,
    children,
    classes,
    flexContent,
    handleDrawerToggle,
    location,
    noTitle,
    onboardingTaskId,
    openSidebar,
    title,
    actions,
  ]);

  const renderPanes = React.useCallback(() => {
    const debugModeEnabledInUnit = userUnits.find(
      ({ menuConfig }) => menuConfig?.debugMode === true,
    );

    const onlyMockUnit = userUnits.find((item) => item?.id === 1000000190);

    const userIsAdmin = checkAccess({ userIsAdmin: true }, userInfo as never, userUnits as never);

    const useDebugPane =
      debugModeEnabledInUnit && (userIsAdmin || onlyMockUnit) && debugMode;

    const mainPane = renderMainPane();

    if (!useDebugPane) {
      return mainPane;
    }

    return (
      <SplitPaneAny
        split="horizontal"
        minSize="calc(100% - 400px)"
        pane1Style={{
          overflow: 'auto',
        }}
      >
        <div className={classes.fullWidth}>{mainPane}</div>
        <DebugTools debugTools={debugTools} />
      </SplitPaneAny>
    );
  }, [debugMode, debugTools, userUnits, userInfo, renderMainPane, classes]);

  React.useEffect(() => {
    if (openSidebar === null) {
      actions.setOpenSidebar(window.innerWidth > LARGE_SCREEN_WIDTH);
    }
  }, [actions, openSidebar]);

  React.useEffect(() => {
    const updateWindowDimensions = () => {
      const open = window.innerWidth > LARGE_SCREEN_WIDTH;

      if (open !== openSidebar) {
        actions.setOpenSidebar(window.innerWidth > LARGE_SCREEN_WIDTH);
      }
    };

    window.addEventListener('resize', updateWindowDimensions);

    hotkeys('ctrl+x', actions.toggleDebugMode);

    return () => {
      const open = window.innerWidth > LARGE_SCREEN_WIDTH;

      if (openSidebar && !open) actions.setOpenSidebar(open);

      window.removeEventListener('resize', updateWindowDimensions);

      hotkeys.unbind('ctrl+x');
    };
  }, [actions, openSidebar]);

  return (
    <>
      <CssBaseline />
      <ProgressLine loading={loading} />
      <Snackbars
        errors={errors}
        onClose={(errorIndex: number) => () => actions.closeError(errorIndex)}
      />
      {renderPanes()}
    </>
  );
};

Layout.defaultProps = {
  disableScrolls: false,
  openSidebar: null,
  breadcrumbs: [],
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
}: {
  app: { openSidebar: boolean | null };
  errors: { list: unknown };
  auth: { debugMode: boolean; userUnits: Unit[]; info: { onboardingTaskId?: unknown } };
}) => ({
  errors: list,
  openSidebar,
  debugMode,
  userUnits,
  userInfo: info,
  onboardingTaskId,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    closeError: bindActionCreators(closeError, dispatch),
    setOpenSidebar: bindActionCreators(setOpenSidebar, dispatch),
    toggleDebugMode: bindActionCreators(toggleDebugMode, dispatch),
  },
});

const styled = withStyles(styles)(Layout as never);

export { default as Content } from 'layouts/components/Content';
export { default as DrawerContent } from 'layouts/components/DrawerContent';

export { drawerWidth };

export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;

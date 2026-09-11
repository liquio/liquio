import ArrowLeftIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowRightIcon from '@mui/icons-material/ArrowForwardIos';
import { Button, Hidden, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { useTranslate } from 'react-translate';
import { bindActionCreators } from 'redux';

import { setOpenDrawer } from 'actions/app';
import Scrollbar from 'components/Scrollbar';

const styles = (theme) => ({
  root: {
    flex: 1,
    [theme.breakpoints.up('md')]: {
      display: 'flex',
    },
  },
  drawerContent: {
    overflowY: 'auto',
  },
  content: {
    flexGrow: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  drawer: {
    flexShrink: 0,
    display: 'none',
    [theme.breakpoints.up('md')]: {
      display: 'flex',
      flexDirection: 'column',
    },
  },
  drawerOpen: {
    backgroundColor: theme.leftSidebarBg,
    zIndex: 1,
    width: 362,
    borderRadius: 8,
    boxShadow:
      '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
    transform: 'translateX(0%)',
    transition: 'all 0.3s ease-in-out',
  },
  drawerClose: {
    transform: 'translateX(0)',
    transition: 'all 0.3s ease-in-out',
  },
  collapseButton: {
    borderBottomRightRadius: 0,
    borderTopRightRadius: 0,
    transition: 'all 0.2s linear',
    minWidth: 40,
    padding: '10px 8px',
    position: 'absolute',
    left: -40,
    '&:hover': {
      left: -48,
      padding: '10px 12px',
    },
  },
  disableHover: {
    position: 'relative',
    left: 0,
    justifyContent: 'flex-start',
    transition: 'all 0s linear',
    borderBottomLeftRadius: 0,
    '&:hover': {
      padding: '10px 8px',
      left: 0,
    },
  },
});

const DrawerContent = ({
  classes,
  className,
  children,
  drawer,
  drawerPosition,
  disableScrolls,
  actions,
  openDrawer,
  collapseButton,
}) => {
  const t = useTranslate('Elements');

  const renderCollapseButton = React.useCallback(() => {
    const tooltip = openDrawer ? t('CollapseSidePanel') : t('ExpandSidePanel');
    return (
      <Tooltip title={tooltip}>
        <Button
          className={classNames({
            [classes.collapseButton]: true,
            [classes.disableHover]: openDrawer,
          })}
          onClick={() => actions.setOpenDrawer(!openDrawer)}
          aria-label={tooltip}
        >
          {openDrawer ? <ArrowRightIcon /> : <ArrowLeftIcon />}
        </Button>
      </Tooltip>
    );
  }, [classes, actions, openDrawer, t]);

  const renderDrawer = React.useCallback(() => {
    if (!drawer) {
      return null;
    }

    return (
      <div
        className={classNames({
          [classes.drawer]: true,
          [classes.drawerOpen]: openDrawer,
          [classes.drawerClose]: !openDrawer,
        })}
      >
        {collapseButton ? renderCollapseButton() : null}
        {openDrawer ? (
          <Scrollbar>
            <div className={classes.drawerContent}>{drawer}</div>
          </Scrollbar>
        ) : null}
      </div>
    );
  }, [renderCollapseButton, classes, openDrawer, collapseButton, drawer]);

  const content = React.useMemo(
    () => (
      <>
        <Hidden mdUp={true} implementation="css">
          {drawer}
        </Hidden>
        {children}
      </>
    ),
    [children, drawer],
  );

  return (
    <div
      className={classNames(className, {
        [classes.root]: true,
      })}
    >
      {drawer && drawerPosition === 'left' ? renderDrawer() : null}
      <div className={classes.content}>
        {disableScrolls ? content : <Scrollbar>{content}</Scrollbar>}
      </div>
      {drawer && drawerPosition === 'right' ? renderDrawer() : null}
    </div>
  );
};

DrawerContent.propTypes = {
  classes: PropTypes.object.isRequired,
  children: PropTypes.node,
  drawer: PropTypes.node,
  drawerPosition: PropTypes.string,
  collapseButton: PropTypes.bool,
  actions: PropTypes.object.isRequired,
  openDrawer: PropTypes.bool.isRequired,
};
DrawerContent.defaultProps = {
  children: null,
  drawer: null,
  drawerPosition: 'right',
  collapseButton: true,
};

const mapStateToProps = ({ app: { openDrawer } }) => ({ openDrawer });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    setOpenDrawer: bindActionCreators(setOpenDrawer, dispatch),
  },
});

const styled = withStyles(styles)(DrawerContent);

export default connect(mapStateToProps, mapDispatchToProps)(styled);

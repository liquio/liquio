import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Button,
  ClickAwayListener,
  IconButton,
  Toolbar,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { translate } from 'react-translate';

import logo from 'assets/img/logo.svg';
import theme from 'core/theme';
import checkAccess from 'helpers/checkAccess';
import getModules from 'modules/index';

const styles = (theme) => ({
  menuButton: {},
  header: {
    color: '#000',
    padding: '16px 24px',
    backgroundColor: theme.headerBg,
    borderBottom: '1px solid #E2E8F0',
    position: 'relative',
    [theme.breakpoints.down('md')]: {
      padding: 8,
      backgroundColor: theme.headerBgSm || theme.leftSidebarBg,
      color: '#fff',
    },
  },
  toolbar: {
    padding: 0,
    minHeight: 'auto',
  },
  flexDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButtonRoot: {
    width: 40,
    height: 40,
  },
  backLink: {
    color: 'rgba(0, 0, 0, 0.54)',
    [theme.breakpoints.down('md')]: {
      color: '#fff',
    },
  },
  logo: {
    marginLeft: 12,
    width: 48,
    height: 48,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    [theme.breakpoints.down('sm')]: {
      width: 200,
      backgroundSize: 'contain',
    },
    ...(theme.logoStyles || {}),
  },
  logoLink: {
    '&:focus': {
      borderRadius: 0,
      outline: `${theme.outlineColor} solid 3px`,
    },
  },
  popoverContent: {
    position: 'absolute',
    top: 30,
    left: 45,
    zIndex: 10,
    backgroundColor: '#fff',
    padding: 3,
    '& button': {
      backgroundColor: theme.palette.primary.main,
      color: '#fff',
      padding: '5px 16px',
      outlineOffset: 3,
    },
  },
  hidden: {
    display: 'none',
  },
});

const Header = ({
  t,
  classes,
  onDrawerToggle,
  hideMenuButton,
  backButton,
  userUnits,
  userInfo,
}) => {
  const widgets = [].concat(...getModules().map((module) => module.appbar || []));
  const checkAccessAction = ({ access }) =>
    !access || checkAccess(access, userInfo, userUnits);

  const [isPopoverOpen, setPopoverOpen] = React.useState(false);
  const menuButton = React.useRef(null);

  React.useEffect(() => {
    const handleTabPress = (event) => {
      if (event.target === menuButton.current) {
        setPopoverOpen(true);
      } else {
        setPopoverOpen(false);
      }
    };

    document.removeEventListener('keydown', handleTabPress);
    document.addEventListener('keydown', handleTabPress);
    return () => {
      document.removeEventListener('keydown', handleTabPress);
    };
  }, []);

  const redirectToMainContent = React.useCallback(() => {
    const contentContainer =
      document.getElementById('main-container').children[1];

    const firstElementWithTabIndex = contentContainer.querySelector(
      '[tabIndex]:not([tabIndex="-1"])',
    );

    if (firstElementWithTabIndex) {
      firstElementWithTabIndex.focus();
    }

    setPopoverOpen(false);
  }, []);

  const handlePopoverClose = React.useCallback(() => {
    setPopoverOpen(false);
  }, []);

  return (
    <AppBar className={classes.header} position="relative" elevation={0}>
      <Toolbar
        className={classNames({
          [classes.toolbar]: true,
          [classes.flexDisplay]: true,
        })}
      >
        <div className={classes.flexDisplay}>
          {backButton ? (
            <IconButton
              classes={{
                root: classes.iconButtonRoot,
              }}
              size="large"
            >
              <Link to={backButton} className={classes.backLink}>
                <ArrowBackIcon />
              </Link>
            </IconButton>
          ) : null}

          {!backButton && !hideMenuButton ? (
            <IconButton
              aria-label={t('OpenMenuButton')}
              onClick={onDrawerToggle}
              className={classes.menuButton}
              ref={menuButton}
            >
              {
                theme?.headerMenuIconButtonColor?.color ? (
                  <MenuIcon
                    htmlColor={theme.headerMenuIconButtonColor.color}
                  />
                ) : <MenuIcon />
              }
            </IconButton>
          ) : null}

          <div
            className={classNames({
              [classes.popoverContent]: true,
              [classes.hidden]: !isPopoverOpen,
            })}
          >
            <ClickAwayListener onClickAway={handlePopoverClose}>
              <Button
                onClick={redirectToMainContent}
                aria-label={t('SkipToMainContent')}
              >
                {t('SkipToMainContent')}
              </Button>
            </ClickAwayListener>
          </div>

          <Link to="/" aria-label={t('HomeLink')} className={classes.logoLink}>
            <div
              className={classes.logo}
              style={{ ...theme.logo, backgroundImage: `url(${logo})` }}
            />
          </Link>
        </div>

        {widgets.filter(checkAccessAction).map((widget, key) => (
          <widget.component key={key} />
        ))}
      </Toolbar>
    </AppBar>
  );
};

Header.propTypes = {
  classes: PropTypes.object.isRequired,
  onDrawerToggle: PropTypes.func.isRequired,
  hideMenuButton: PropTypes.bool,
};

Header.defaultProps = {
  hideMenuButton: false,
};

const mapStateToProps = ({
  app: { openSidebar },
  auth: { userUnits, info },
}) => ({
  openSidebar,
  userUnits,
  userInfo: info,
});

const translated = translate('Navigator')(Header);
const connected = connect(mapStateToProps)(translated);
export default withStyles(styles)(connected);

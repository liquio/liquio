import { FormControlLabel, MenuItem, MenuList, Switch } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import MobileDetect from 'mobile-detect';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { history } from 'store';

import { logout, toggleDebugMode } from 'actions/auth';
import UserName from 'components/Auth/UserName';
import checkAccess from 'helpers/checkAccess';
import { getConfig } from 'helpers/configLoader';

const styles = (theme) => ({
  userName: {
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '20px',
    letterSpacing: '.1px',
    margin: '0 0 4px 0',
    color: '#000',
    ...(theme?.userName || {})
  },
  subTitle: {
    fontSize: 10,
    maxWidth: '135px',
    display: 'block',
    textOverflow: 'ellipsis',
    overflow: 'hidden'
  },
  iconButtonAvatar: {
    padding: 0,
    outlineOffset: 3
  },
  avatar: {
    width: 24,
    height: 24
  },
  menuLink: {
    textDecoration: 'none'
  },
  outerLinkRoot: {
    padding: 0
  },
  outerLink: {
    color: 'rgba(0, 0, 0, 0.87)',
    textDecoration: 'none',
    width: '100%',
    height: '100%',
    padding: '6px 16px'
  },
  menuListRoot: {
    padding: 0,
    display: 'flex',
    '& > li': {
      textDecoration: 'underline',
      color: theme?.linksColor || theme?.menuListRootLinksColor?.color || '#0068FF',
      fontSize: 12,
      fontWeight: 400,
      lineHeight: '16px',
      letterSpacing: '.4px',
      padding: 0,
      outline: 'none',
      minHeight: 'auto',
      '&:not(:last-child)': {
        marginRight: 18,
        '&:before': {
          display: 'block',
          width: 2,
          height: 16,
          backgroundColor: '#C8C8C8',
          content: '""',
          position: 'absolute',
          right: '-9px'
        }
      },
      '&:hover': {
        backgroundColor: 'transparent'
      }
    }
  }
});

class ProfileAppBar extends React.Component {
  constructor(props) {
    super(props);

    const {
      application: { type: applicationType },
      cabinetUrl,
      adminPanelUrl
    } = getConfig();

    const { origin } = window.location;
    this.isAdmin = origin === adminPanelUrl;
    this.isCabinet = origin === cabinetUrl;
    this.applicationType = applicationType;

    this.state = { anchorEl: null };
  }

  handleMenuOpen = ({ currentTarget }) => this.setState({ anchorEl: currentTarget });

  handleMenuClose = () => this.setState({ anchorEl: null });

  handleLogout = () => {
    const { actions } = this.props;
    this.handleMenuClose();
    actions.logout(true);
  };

  renderOuterLink = (url, title) => {
    const { classes } = this.props;

    return (
      <MenuItem
        classes={{
          root: classes.outerLinkRoot
        }}
      >
        <a
          href={url}
          className={classes.outerLink}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={0}
          aria-label={title}
        >
          {title}
        </a>
      </MenuItem>
    );
  };

  render() {
    const { t, classes, userInfo, userUnits, debugMode, actions } = this.props;

    const userIsGod = checkAccess({ userIsGod: true }, userInfo, userUnits);
    const userIsAdmin = checkAccess({ userIsAdmin: true }, userInfo, userUnits);

    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();

    return (
      <>
        <div className={classes.root}>
          {this.applicationType !== 'adminpanel' && isMobile ? null : (
            <p className={classes.userName}>
              <UserName {...userInfo} />
            </p>
          )}
          <MenuList
            classes={{
              root: classes.menuListRoot
            }}
          >
            {this.applicationType !== 'adminpanel' && !isMobile ? (
              <MenuItem
                autoFocus={true}
                aria-label={t('MyProfile')}
                tabIndex={0}
                onClick={() => {
                  history.push('/profile');
                  this.handleMenuClose();
                }}
              >
                {t('MyProfile')}
              </MenuItem>
            ) : null}
            {userIsGod && userIsAdmin ? (
              <>
                {this.isAdmin ? this.renderOuterLink(cabinetUrl, t('ToCabinet')) : null}
                {this.isCabinet ? this.renderOuterLink(adminPanelUrl, t('ToAdminPanel')) : null}
                <MenuItem>
                  <FormControlLabel
                    control={<Switch checked={debugMode} onChange={actions.toggleDebugMode} />}
                    label={t('DebugMode')}
                  />
                </MenuItem>
              </>
            ) : null}
            {this.applicationType !== 'adminpanel' && isMobile ? null : (
              <MenuItem tabIndex={0} aria-label={t('Logout')} onClick={this.handleLogout}>
                {t('Logout')}
              </MenuItem>
            )}
          </MenuList>
        </div>
      </>
    );
  }
}

ProfileAppBar.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  userInfo: PropTypes.object,
  userUnits: PropTypes.array
};

ProfileAppBar.defaultProps = {
  userInfo: {},
  userUnits: []
};

const mapStateToProps = ({ auth: { info: userInfo, userUnits, debugMode } }) => ({
  userInfo,
  userUnits,
  debugMode
});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    logout: bindActionCreators(logout, dispatch),
    toggleDebugMode: bindActionCreators(toggleDebugMode, dispatch)
  }
});

const styled = withStyles(styles)(ProfileAppBar);
const translated = translate('Navigator')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

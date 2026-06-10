import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Avatar,
  ButtonBase,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { logout, toggleDebugMode } from 'actions/auth';
import classNames from 'classnames';
import UserName from 'components/Auth/UserName';
import { LanguageSelector } from 'core/modules/profile/components/LanguageSelector';
import md5 from 'md5';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';

const styles = (theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px 12px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: theme?.header?.profile?.textColor || '#ffffff',
    transition: 'background-color 140ms ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.12)'
    }
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    maxWidth: 220
  },
  profileTitle: {
    fontSize: 15,
    lineHeight: '19px',
    fontWeight: 600,
    ...theme.textCut(1)
  },
  profileSubTitle: {
    fontSize: 12,
    lineHeight: '16px',
    opacity: 0.7,
    textAlign: 'left',
    ...theme.textCut(1)
  },
  avatar: {
    width: 40,
    height: 40,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 6px 14px rgba(0, 0, 0, 0.2)'
  },
  menuPaper: {
    marginTop: 8,
    borderRadius: 10,
    minWidth: 240,
    padding: 0,
    background: 'linear-gradient(180deg, rgba(18, 22, 28, 0.98), rgba(18, 22, 28, 0.92))',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  menuHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '6px 10px'
  },
  menuName: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '18px',
    ...theme.textCut(1)
  },
  menuSubTitle: {
    fontSize: 11,
    lineHeight: '14px',
    opacity: 0.7,
    ...theme.textCut(1)
  },
  menuItem: {
    marginTop: 2,
    marginBottom: 2
  },
  menuLanguageItem: {
    padding: '6px 10px',
    display: 'flex',
    justifyContent: 'center'
  },
  logoutItem: {
    color: '#ffb3b3'
  }
});

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const getInitials = (userInfo) => {
  if (!userInfo) return '';
  const fallback = userInfo.name || userInfo.login || userInfo.username || userInfo.email || '';
  const tokens = [userInfo.firstName, userInfo.lastName, userInfo.middleName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const source = tokens || fallback;
  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0])
    .join('')
    .toUpperCase();
};

const ProfileAppbar = ({ t, actions, classes, userInfo, userUnits, baseUnits }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    actions.logout(true);
  };

  const userUnit = (userUnits || [])
    .map(({ name }) => name)
    .filter((key) => !baseUnits.includes(key))
    .join(', ');

  const avatarUrl = React.useMemo(() => {
    const email = normalizeEmail(
      userInfo?.email || userInfo?.mail || userInfo?.login || userInfo?.username || ''
    );
    return `https://www.gravatar.com/avatar/${md5(email)}?d=mp&s=96`;
  }, [userInfo]);

  const initials = React.useMemo(() => getInitials(userInfo), [userInfo]);

  return (
    <div
      className={classNames({
        [classes.root]: true
      })}
    >
      <Tooltip title={userUnit ?? ''}>
        <ButtonBase
          className={classes.profileButton}
          onClick={handleMenuOpen}
          aria-controls={menuOpen ? 'profile-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={menuOpen ? 'true' : undefined}
          data-testid="profile-appbar-button"
        >
          <Avatar src={avatarUrl} alt={t('Profile')} className={classes.avatar}>
            {initials}
          </Avatar>
          <div className={classes.profileText}>
            <span className={classes.profileTitle}>
              <UserName {...userInfo} />
            </span>
            <span className={classes.profileSubTitle}>{userUnit}</span>
          </div>
          <ExpandMoreIcon fontSize="small" />
        </ButtonBase>
      </Tooltip>
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{ className: classes.menuPaper }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        data-testid="profile-appbar-menu"
      >
        <div className={classes.menuHeader}>
          <Avatar src={avatarUrl} alt={t('Profile')} className={classes.avatar}>
            {initials}
          </Avatar>
          <div className={classes.profileText}>
            <div className={classes.menuName}>
              <UserName {...userInfo} />
            </div>
            <div className={classes.menuSubTitle}>{userUnit}</div>
          </div>
        </div>
        <div className={classes.menuLanguageItem}>
          <LanguageSelector darkTheme />
        </div>
        <Divider />
        <MenuItem
          className={classNames(classes.menuItem, classes.logoutItem)}
          onClick={handleLogout}
          data-testid="profile-menu-logout"
        >
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('Logout')} />
        </MenuItem>
      </Menu>
    </div>
  );
};

ProfileAppbar.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  userInfo: PropTypes.object,
  userUnits: PropTypes.array,
  baseUnits: PropTypes.array.isRequired
};
ProfileAppbar.defaultProps = {
  userInfo: {},
  userUnits: [],
  baseUnits: ['based', 'Базовий юніт']
};

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }) => ({
  userInfo,
  userUnits
});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    logout: bindActionCreators(logout, dispatch),
    toggleDebugMode: bindActionCreators(toggleDebugMode, dispatch)
  }
});

const styled = withStyles(styles)(ProfileAppbar);
const translated = translate('Navigator')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

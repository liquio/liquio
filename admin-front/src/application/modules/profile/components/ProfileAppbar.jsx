import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { history } from 'store';
import classNames from 'classnames';
import { IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { logout, toggleDebugMode } from 'actions/auth';
import UserName from 'components/Auth/UserName';
import checkAccess from 'helpers/checkAccess';

const styles = (theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: {
    maxWidth: 'calc(100% - 40px)',
    '& *': {
      color: theme.header.profile.textColor,
    },
  },
  title: {
    fontSize: 18,
    lineHeight: '21px',
    marginBottom: 8,
    ...theme.textCut(1),
  },
  subTitle: {
    fontSize: 12,
    lineHeight: '14px',
    ...theme.textCut(1),
  },
  iconButtonAvatar: {
    padding: 0,
  },
  avatar: {
    width: 24,
    height: 24,
  },
  outerLinkRoot: {
    padding: 0,
  },
  pointer: {
    cursor: 'pointer',
  },
});

const ProfileAppbar = ({
  t,
  actions,
  classes,
  userInfo,
  userUnits,
  baseUnits,
}) => {
  const hasAccess = checkAccess(
    { userHasUnit: [1000001, 1000000041] },
    userInfo,
    userUnits,
  );

  const handleLogout = () => actions.logout(true);

  const handleClick = () => history.push(`/users?#id=${userInfo.userId}`);

  const userUnit = (userUnits || [])
    .map(({ name }) => name)
    .filter((key) => !baseUnits.includes(key))
    .join(', ');

  return (
    <div
      className={classNames({
        [classes.root]: true,
      })}
    >
      <Tooltip title={userUnit}>
        <div
          className={classNames({
            [classes.link]: true,
            [classes.pointer]: hasAccess,
          })}
          onClick={handleClick}
        >
          <div className={classes.title}>
            <UserName {...userInfo} />
          </div>
          <div className={classes.subTitle}>{userUnit}</div>
        </div>
      </Tooltip>
      <IconButton
        id="avatar-btn"
        color="inherit"
        className={classes.iconButtonAvatar}
        onClick={handleLogout}
        size="large"
      >
        <Tooltip title={t('Logout')}>
          <ExitToAppIcon className={classes.avatar} />
        </Tooltip>
      </IconButton>
    </div>
  );
};

ProfileAppbar.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  userInfo: PropTypes.object,
  userUnits: PropTypes.array,
  baseUnits: PropTypes.array.isRequired,
};
ProfileAppbar.defaultProps = {
  userInfo: {},
  userUnits: [],
  baseUnits: ['based', 'Базовий юніт'],
};

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }) => ({
  userInfo,
  userUnits,
});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    logout: bindActionCreators(logout, dispatch),
    toggleDebugMode: bindActionCreators(toggleDebugMode, dispatch),
  },
});

const styled = withStyles(styles)(ProfileAppbar);
const translated = translate('Navigator')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

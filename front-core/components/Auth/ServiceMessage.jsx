import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Typography, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ErrorIcon from '@mui/icons-material/ErrorOutline';

import { logout } from 'actions/auth';

const styles = {
  errorIcon: {
    fontSize: 82,
    color: 'red'
  },
  wrap: {
    width: 700,
    marginTop: 100,
    paddingLeft: 50,
    '@media (max-width: 767px)': {
      width: '100%',
      marginTop: 50,
      paddingLeft: 0
    }
  },
  title: {
    padding: '0 12px',
    marginTop: 15
  },
  errorText: {
    margin: '20px 0 28px'
  },
  button: {
    marginTop: 20,
    marginLeft: 12
  }
};

const ServiceMessage = ({ t, classes, error, actions, canSwitchUser, logoutText }) => (
  <div className={classes.wrap}>
    <ErrorIcon className={classes.errorIcon} />
    <Typography className={classes.title} variant="h4" gutterBottom={true}>
      {t(error.message)}
    </Typography>
    <Typography className={classes.title} variant="subtitle1" gutterBottom={true}>
      {t(error.message + ' subtitle')}
    </Typography>
    {error.message === 'User without needed role.' ||
    error.message === 'Access denied.' ||
    error.message === 'Declined by user access rules.' ||
    error.message === 'NoPermissionIp' ||
    canSwitchUser ? (
      <Button
        variant="outlined"
        color="primary"
        onClick={actions.logout}
        className={classes.button}
      >
        {t(logoutText || 'SwitchUser')}
      </Button>
    ) : null}
  </div>
);

const mapDispatchToProps = (dispatch) => ({
  actions: {
    logout: bindActionCreators(logout, dispatch)
  }
});

const styled = withStyles(styles)(ServiceMessage);
const translated = translate('App')(styled);
export default connect(null, mapDispatchToProps)(translated);

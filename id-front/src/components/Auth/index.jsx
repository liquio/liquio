import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@mui/styles/withStyles';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import EmptyPage from 'components/EmptyPage';
import { Button } from '@mui/material';

const styles = {
  wrap: {
    paddingTop: 64,
    paddingLeft: 260,
    '@media (max-width: 959px)': {
      paddingLeft: 0,
    },
  },
  button: {
    marginLeft: '62px',
  },
};

const Auth = ({ classes, children, t, DBError }) => {
  if (DBError) {
    return (
      <div className={classes.wrap}>
        <EmptyPage title={t('ERROR')} description={t('ERROR_DESCRIPTION')} />
        <Button variant="outlined" color="primary" onClick={() => (window.location.href = '/logout')} className={classes.button}>
          {t('SwitchUser')}
        </Button>
      </div>
    );
  }
  return children;
};

Auth.propTypes = {
  children: PropTypes.node,
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  DBError: PropTypes.bool.isRequired,
  ERROR_503: PropTypes.bool.isRequired,
};

Auth.defaultProps = {
  children: <div />,
};

const translated = translate('Auth')(Auth);
export default connect(({ auth: { DBError, ERROR_503 } }) => ({
  DBError,
  ERROR_503,
}))(withStyles(styles)(translated));

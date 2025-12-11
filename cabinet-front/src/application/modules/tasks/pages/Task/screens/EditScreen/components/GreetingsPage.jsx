import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import Handlebars from 'handlebars';
import { bindActionCreators } from 'redux';
import { Typography, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import { Content } from 'layouts/LeftSidebar';
import { logout } from 'actions/auth';

const styles = (theme) => ({
  root: {
    padding: '120px 0 0',
    textAlign: 'center',
    ...(theme?.greetingsRoot || {})
  },
  title: {
    margin: '40px 0',
    ...(theme?.greetingsTitle || {})
  },
  content: {
    margin: '0 auto 50px',
    maxWidth: 600,
    ...(theme?.greetingsContent || {})
  },
  button: {
    display: 'inline-flex',
    marginRight: '15px'
  }
});

const GreetingsPage = ({ t, classes, user, title, content, onDone, actions }) => (
  <Content>
    <div className={classes.root}>
      <Typography variant="h5" className={classes.title}>
        {Handlebars.compile(title)({ user })}
      </Typography>
      <Typography variant="body1" className={classes.content}>
        {Handlebars.compile(content)({ user })}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={onDone}
        size="large"
        className={classes.button}
      >
        {t('Start')}
      </Button>
      <Button
        variant="outlined"
        color="primary"
        onClick={actions.logout}
        size="large"
        style={{ margin: 'auto' }}
      >
        {t('Logout')}
      </Button>
    </div>
  </Content>
);

GreetingsPage.propTypes = {
  classes: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  title: PropTypes.string,
  content: PropTypes.string,
  onDone: PropTypes.func
};

GreetingsPage.defaultProps = {
  title: '',
  content: '',
  onDone: () => null
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    logout: bindActionCreators(logout, dispatch)
  }
});

const mapStateToProps = ({ auth: { info } }) => ({ user: info });

const styled = withStyles(styles)(GreetingsPage);
const translated = translate('TaskPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

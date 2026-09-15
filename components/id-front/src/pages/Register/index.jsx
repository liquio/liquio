import React, { Component, Suspense } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import setComponentsId from 'helpers/setComponentsId';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Snackbar, Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import style from 'assets/jss';
import { signUpConfirmation, getAuth } from 'actions/auth';
import Layout from 'layouts/topHeader';
import BlockScreen from 'components/BlockScreen';
import Preloader from 'components/Preloader';
import theme from 'themes';

const RegisterForm = React.lazy(() => import('./components/RegisterForm'));

class RegisterPage extends Component {
  state = {
    values: this.props.values,
    error: '',
    blockScreen: true,
    registerStarts: false,
    showPreloader: false,
  };

  componentDidMount = async () => {
    const { FORCE_REGISTER } = config || {};
    const { values } = this.state;

    if (!FORCE_REGISTER) {
      this.setState({ blockScreen: false });
      return;
    }
    if (FORCE_REGISTER) {
      this.setState({ showPreloader: true });
      setTimeout(() => {
        this.setState({ showPreloader: false });
      }, 500);
    }

    this.handleSubmit(values);
  };

  handleSubmit = async (values) => {
    delete values.agreement;

    this.setState({ blockScreen: true });

    const { FORCE_REGISTER } = config || {};

    const { success, redirect, err, message } = await signUpConfirmation(values);

    if (success) {
      return window.location.replace(redirect);
    }

    const error = message || err;

    if (error && FORCE_REGISTER) {
      window.location.href = '/logout';
    }

    if (!error) {
      await getAuth();
      const { success, redirect } = await signUpConfirmation(values);
      if (success) {
        return window.location.replace(redirect);
      }
    }

    return this.setState({ error, blockScreen: false }, () => console.log(error));
  };

  closeError = () => this.setState({ error: '', blockScreen: false });

  handleStartRegister = () => this.setState({ registerStarts: true });

  render = () => {
    const { setId, t, classes } = this.props;
    const { values, error, blockScreen, registerStarts, showPreloader } = this.state;

    if (registerStarts) {
      return (
        <Layout setId={(elementName) => setId(`left-side-bar-${elementName}`)} isRegister={true}>
          <BlockScreen open={blockScreen} />
          {error && (
            <Snackbar
              id={setId('error')}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              open={true}
              message={
                <span id="message-id" name={error}>
                  {t(error)}
                </span>
              }
              action={[
                <Button key="close-error" variant="contained" color="primary" size="small" onClick={this.closeError} aria-label={t('OK')}>
                  {t('OK')}
                </Button>,
              ]}
            />
          )}
          <Suspense fallback={<Preloader />}>
            <RegisterForm values={values} onSubmit={this.handleSubmit} setId={(elementName) => setId(`register-form-${elementName}`)} />
          </Suspense>
        </Layout>
      );
    }

    if (showPreloader) {
      return (
        <Suspense fallback={<Preloader />}>
          <BlockScreen open={true} />
        </Suspense>
      );
    }

    return (
      <Layout setId={(elementName) => setId(`left-side-bar-${elementName}`)} isGreeting={true}>
        <Typography variant="h1" sx={{ mb: 2, fontSize: '3rem' }}>
          {t('GREETINGS', { name: values?.first_name || values?.companyName || '' })}
        </Typography>

        <Typography variant="body1" sx={{ mb: 4 }}>
          {t('GREETINGS_DESCRIPTION')}
        </Typography>

        <div
          className={classNames({
            [classes.alignActions]: theme.centerActions,
          })}
        >
          <Button variant="contained" color="primary" onClick={this.handleStartRegister} aria-label={t('START_REGISTER')}>
            {t('START_REGISTER')}
          </Button>
        </div>
      </Layout>
    );
  };
}

RegisterPage.propTypes = {
  setId: PropTypes.func,
  values: PropTypes.object,
};

RegisterPage.defaultProps = {
  setId: setComponentsId('app'),
  values: {},
};

const styled = withStyles(style)(RegisterPage);
const translated = translate('RegisterForm')(styled);

function mapStateToProps(state) {
  return { auth: state.authorization };
}

export default connect(mapStateToProps)(translated);

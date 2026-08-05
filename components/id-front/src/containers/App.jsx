import React, { Component, Suspense } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getAuth } from 'actions/auth';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';
import Scrollbar from 'components/Scrollbar';
import Preloader from 'components/Preloader';
import setComponentsId from 'helpers/setComponentsId';
import 'dayjs/locale/uk';
import { getConfig } from 'helpers/configLoader';

const LoginPage = React.lazy(() => import('pages/Login'));
const RegisterPage = React.lazy(() => import('pages/Register'));
const TwoFactorAuth = React.lazy(() => import('pages/TwoFactorAuth'));
const BlockScreen = React.lazy(() => import('components/BlockScreen'));
const EmptyPage = React.lazy(() => import('components/EmptyPage'));

const styles = {
  wrap: {
    paddingTop: 64,
    paddingLeft: 260,
    '@media (max-width: 959px)': {
      paddingLeft: 0,
    },
  },
};

class App extends Component {
  state = { ready: false, loading: true };

  componentWillMount = () => {
    const { WSO2 = {} } = getConfig();

    getAuth()
      .then(() => {
        if (WSO2.redirect) {
          window.location.href = '/authorise/wso2';
        } else {
          this.setState({ ready: true });
        }
      })
      .catch(() => null);
  };

  componentWillReceiveProps = ({ redirect }) => {
    if (redirect) {
      const { BACKEND_URL } = getConfig();
      const redirectURL =
        BACKEND_URL + (BACKEND_URL.charAt(BACKEND_URL.length - 1) !== '/' ? '/' : '') + redirect.split('/').filter(Boolean).join('/');
      document.location.href = redirectURL;
    }
  };

  render() {
    const { provider, user, redirect, info, twoFactorAuthNeeded, setId, DBError, classes, t } = this.props;
    const { ready } = this.state;

    const DBErrorBlock = () => {
      return (
        <div className={classes.wrap}>
          <Suspense fallback={<Preloader />}>
            <EmptyPage title={t('ERROR')} description={t('DB_ERROR_DESCRIPTION')} />
          </Suspense>
        </div>
      );
    };

    const PendingBlock = () => {
      return (
        <Suspense fallback={<Preloader />}>
          <BlockScreen open={true} />
        </Suspense>
      );
    };

    const TwoFactorBlock = () => {
      return (
        <Scrollbar>
          <Suspense fallback={<Preloader />}>
            <TwoFactorAuth values={info} setId={(elementName) => setId(`two-factor-${elementName}`)} />
          </Suspense>
        </Scrollbar>
      );
    };

    const RegisterBlock = () => {
      return (
        <Scrollbar>
          <Suspense fallback={<Preloader />}>
            <RegisterPage values={user} setId={(elementName) => setId(`register-${elementName}`)} />
          </Suspense>
        </Scrollbar>
      );
    };

    if (DBError) {
      return <DBErrorBlock />;
    }

    if (!ready || redirect) {
      return <PendingBlock />;
    }

    if (info && twoFactorAuthNeeded) {
      return <TwoFactorBlock />;
    }

    if (provider && user && (ready || !redirect)) {
      return (
        <Scrollbar>
          <Suspense fallback={<Preloader />}>
            <RegisterBlock />;
          </Suspense>
        </Scrollbar>
      );
    }

    return (
      <Scrollbar containLayout={true}>
        <Suspense fallback={<Preloader />}>
          <LoginPage setId={(elementName) => setId(`login-${elementName}`)} />
        </Suspense>
      </Scrollbar>
    );
  }
}

App.propTypes = {
  setId: PropTypes.func,
  provider: PropTypes.object,
  user: PropTypes.object,
  info: PropTypes.object,
  redirect: PropTypes.string,
  twoFactorAuthNeeded: PropTypes.bool,
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  DBError: PropTypes.bool.isRequired,
};

App.defaultProps = {
  setId: setComponentsId('app'),
  provider: null,
  user: null,
  info: null,
  redirect: '',
  twoFactorAuthNeeded: false,
};

const translated = translate('App')(App);

export default connect(({ auth }) => auth)(withStyles(styles)(translated));

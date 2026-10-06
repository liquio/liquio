import React, { Component, Suspense } from 'react';
import type { ComponentType } from 'react';
import { connect } from 'react-redux';
import { getAuth } from 'actions/auth';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';
import type { StyleRules, WithStyles } from '@mui/styles/withStyles';
import Scrollbar from 'components/Scrollbar';
import Preloader from 'components/Preloader';
import setComponentsId from 'helpers/setComponentsId';
import 'dayjs/locale/uk';
import { getConfig } from 'helpers/configLoader';
import type { RootState } from 'store/types';

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
} satisfies StyleRules;

// Everything but `classes` and `t` comes from `state.auth` (see `connect` below), except `setId`.
interface AppProps extends WithStyles<typeof styles> {
  setId: (elementName: string) => string;
  t: Translate;
  provider?: unknown;
  // Passed on to the register and two-factor pages as their `values`; the shape is the API's, not validated.
  user?: Record<string, unknown> | null;
  info?: Record<string, unknown> | null;
  redirect?: string;
  twoFactorAuthNeeded?: boolean;
  DBError: boolean;
}

interface AppState {
  ready: boolean;
  loading: boolean;
}

class App extends Component<AppProps, AppState> {
  static defaultProps = {
    setId: setComponentsId('app'),
    provider: null,
    user: null,
    info: null,
    redirect: '',
    twoFactorAuthNeeded: false,
  };

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

  componentWillReceiveProps = ({ redirect }: AppProps) => {
    if (redirect) {
      const BACKEND_URL = getConfig().BACKEND_URL as string; // undefined throws on `charAt`, as before
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

    // These blocks are only rendered when `info` / `user` are set (see the checks below), but TypeScript cannot
    // narrow them inside the arrow components: hence the casts.
    const TwoFactorBlock = () => {
      return (
        <Scrollbar>
          <Suspense fallback={<Preloader />}>
            <TwoFactorAuth values={info as Record<string, unknown>} setId={(elementName: string) => setId(`two-factor-${elementName}`)} />
          </Suspense>
        </Scrollbar>
      );
    };

    const RegisterBlock = () => {
      return (
        <Scrollbar>
          <Suspense fallback={<Preloader />}>
            <RegisterPage values={user as Record<string, unknown>} setId={(elementName: string) => setId(`register-${elementName}`)} />
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
          <LoginPage setId={(elementName: string) => setId(`login-${elementName}`)} />
        </Suspense>
      </Scrollbar>
    );
  }
}

const translated = translate('App')(App);

// `connect` injects the whole `state.auth` (its `[key: string]: unknown` index signature makes react-redux's prop
// matching treat `setId` as `unknown`), so the mapped state is narrowed to the props App reads, and the styled,
// translated component is cast to the props it really takes (as in `Auth`). Types only; the runtime still maps
// the entire `auth` slice onto the props.
type AppStateProps = Pick<AppProps, 'provider' | 'user' | 'info' | 'redirect' | 'twoFactorAuthNeeded' | 'DBError'>;
// `setId` has a default (`defaultProps`), so callers (the router passes none) may omit it.
type AppOwnProps = Omit<AppProps, 't' | 'classes' | 'setId'> & Partial<Pick<AppProps, 'setId'>>;
const styled = withStyles(styles)(translated) as ComponentType<AppOwnProps>;
export default connect(({ auth }: RootState) => auth as AppStateProps)(styled);

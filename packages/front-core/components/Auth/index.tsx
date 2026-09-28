import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import jwtDecode from 'jwt-decode';
import queryString from 'query-string';
import { translate } from 'react-translate';
import moment from 'moment';
import generatePassword from 'password-generator';

import LoginScreen from 'components/Auth/LoginScreen';
import BlockScreen from 'components/Auth/BlockScreen';
import { getConfig } from 'core/helpers/configLoader';
import { history } from 'store';
import { ping } from 'actions/app';
import {
  requestAuth,
  requestUnits,
  requestUserInfo,
  requestTestCode,
  requestAllUnits
} from 'actions/auth';
import { getLocalizationTexts, getLocalizationLanguages } from 'actions/localization';
import storage from 'helpers/storage';
import checkAccess from 'helpers/checkAccess';
import processList from 'services/processList';
import * as api from 'services/api';
import { access, getInitActions } from 'application';
import ServiceMessage from 'components/Auth/ServiceMessage';
import checkExpiringDate from 'helpers/checkExpiringDate';
import edsService from 'services/eds';
import Signer from 'services/eds/signer';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import ChangePassword from 'components/ChangePassword';
import { getCurrentLanguageCode } from 'helpers/localization';
import { requestUserSettings } from '../../actions/auth';
import { AuthState, AuthUnit } from 'core/types/authState';

const preloadNavigationTree = async (dispatch: Dispatch) => {
  const token = storage.getItem('token');
  const debugUserId = storage.getItem('debug-user-id');

  try {
    const response = await fetch(`${api.getApiUrl()}navigation-tree`, {
      method: 'GET',
      cache: 'reload',
      headers: {
        ...(token ? { token } : {}),
        ...(debugUserId ? { 'debug-user-id': debugUserId } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`NavigationTreeRequestFailed:${response.status}`);
    }

    const body = await response.json().catch(() => ({}));
    dispatch({
      type: 'GET_NAVIGATION_TREE_SUCCESS',
      payload: Array.isArray(body?.data) ? body.data : null
    });
  } catch (error) {
    dispatch({
      type: 'GET_NAVIGATION_TREE_FAIL',
      payload: error
    });
  }
};

interface AuthProps {
  children?: React.ReactNode;
  actions: Record<string, (...args: unknown[]) => unknown>;
  initActions?: Record<string, (...args: unknown[]) => unknown>;
  auth: AuthState;
  app: { navigationTree?: unknown; navigationTreeLoaded?: boolean };
  dispatch: Dispatch;
  serviceMessage?: Error | null;
  t: (key: string, params?: Record<string, unknown>) => string;
}

interface AuthComponentState {
  error: Error | null;
}

class Auth extends React.Component<AuthProps, AuthComponentState> {
  static defaultProps = {
    children: null,
    auth: {},
    app: {},
    initActions: {},
    serviceMessage: null
  };

  application: { type?: string; [key: string]: unknown };
  applicationType: string;
  nullUnitIds: unknown[];
  enabledUnitId: unknown;
  isNavigationTreePreloadingEnabled: boolean;

  constructor(props: AuthProps) {
    super(props);
    this.state = { error: null };

    const {
      application,
      application: { type: applicationType = 'manager' } = {},
      nullUnitIds = [],
      enabledUnitId,
      features: { navigationTreePreloading } = {}
    } = getConfig() as unknown as {
      application?: { type?: string };
      nullUnitIds?: unknown[];
      enabledUnitId?: unknown;
      features?: { navigationTreePreloading?: boolean };
    };

    this.application = application || {};
    this.applicationType = applicationType as string;
    this.nullUnitIds = nullUnitIds;
    this.enabledUnitId = enabledUnitId;
    this.isNavigationTreePreloadingEnabled = navigationTreePreloading === true;
  }

  onFocus = () => {
    const {
      auth: { info }
    } = this.props;
    const token = storage.getItem('token');

    if (!token || !info) return;

    try {
      const { userId } = jwtDecode<{ userId?: string }>(token);

      if (info.userId !== userId) {
        window.location.reload();
      }
    } catch {
      console.warn('invalid token =>', token);
    }
  };

  getLocalizationTexts = async () => {
    const { actions } = this.props;
    const config = getConfig();

    if (!config.multiLanguage) return;

    try {
      const langCodeFromStorage = storage.getItem('lang');
      const langCode =
        langCodeFromStorage ||
        getCurrentLanguageCode({
          defaultLanguage: config.defaultLanguage,
          fallbackLanguage: 'uk'
        });

      await actions.getLocalizationLanguages();

      if (!langCode) {
        await actions.getLocalizationTexts();
        return;
      }

      await actions.getLocalizationTexts(langCode);

      if (!langCodeFromStorage) {
        storage.setItem('lang', langCode);
      }
    } catch (e) {
      console.error('Failed to get localization codes', e);
    }
  };

  init = async () => {
    const { error } = this.state;

    const {
      actions,
      initActions,
      auth: { units, info: userInfo, settings }
    } = this.props;

    const {
      code,
      testToken,
      state,
      redirect_uri: redirectUri
    } = queryString.parse(window.location.search) as Record<string, string | undefined>;

    const backUrl = storage.getItem('backUrl');
    const signature = storage.getItem('cabState');

    let finalState = (state && state === signature && state) as string | undefined;

    if (testToken) storage.setItem('token', testToken);

    if (redirectUri && !finalState) {
      const signature = generatePassword(20, false);
      storage.setItem('cabState', signature);
      finalState = signature;
    }

    if (userInfo || error) return;

    let auth: Record<string, unknown>;
    this.checkRedirect(redirectUri as string);

    try {
      const authResult = await actions.requestAuth(code, finalState);
      storage.removeItem('cabState');

      if (authResult instanceof Error) {
        throw authResult;
      }

      if (!authResult) {
        throw new Error('AuthProcessError');
      }

      auth = authResult as Record<string, unknown>;

      if (this.applicationType === 'adminpanel' && !settings) {
        await actions.requestUserSettings();
      }
    } catch (e) {
      this.setState({ error: e as Error });
      return;
    }

    await this.getLocalizationTexts();

    if (this.isNavigationTreePreloadingEnabled) {
      await preloadNavigationTree(this.props.dispatch);
    }

    if (!units) {
      const request =
        await actions[this.application.type === 'manager' ? 'requestUnits' : 'requestAllUnits']();

      if (request instanceof Error) {
        this.setState({ error: request });
        return;
      }
    }

    Object.keys(initActions || {}).forEach((initAction) => {
      const getCountsMethod = ['getMyUnreadTaskCount', 'getUnitUnreadTaskCount'];
      type MenuConfig = { navigation?: { tasks?: { InboxTasks?: unknown; UnitInboxTasks?: unknown } } };
      const authUserUnits = (auth.userUnits || []) as Array<{ menuConfig?: MenuConfig }>;
      const hasMyTaskNoAccess = authUserUnits.every(
        (unit) => !unit.menuConfig?.navigation?.tasks?.InboxTasks
      );
      const hasUnitNoAccess = authUserUnits.every(
        (unit) => !unit.menuConfig?.navigation?.tasks?.UnitInboxTasks
      );
      if ((hasMyTaskNoAccess || hasUnitNoAccess) && getCountsMethod.includes(initAction)) {
        return;
      }
      processList.hasOrSet(initAction, (initActions as Record<string, never>)[initAction]);
    });

    this.checkCertificateExpiring(auth.onboardingTaskId as never);
    if (backUrl && !auth.onboardingTaskId) {
      storage.removeItem('backUrl');
      history.replace(backUrl);
    }

    if (redirectUri) {
      const isOuterUrl = (redirectUri || '').includes('http');

      if (isOuterUrl) {
        window.location.href = redirectUri;
        return;
      }

      history.replace(redirectUri);
    }
  };

  isInitialized = () => {
    const {
      auth: { info, userUnits, settings },
      app: { navigationTree, navigationTreeLoaded }
    } = this.props;
    const { type = 'manager' } = this.application || {};

    const navigationTreeReady =
      !this.isNavigationTreePreloadingEnabled ||
      navigationTreeLoaded ||
      Array.isArray(navigationTree);

    const checkObjects: unknown[] = [info, userUnits, navigationTreeReady];

    if (type === 'adminpanel') {
      checkObjects.push(settings);
    }

    return checkObjects.every(Boolean);
  };

  checkCertificateExpiring = async (auth?: { services?: { eds?: { data?: { pem?: string } } } }) => {
    const { actions, t } = this.props;

    const certificate = auth?.services?.eds?.data?.pem;

    if (!certificate) return;

    const signer = edsService.getSigner() as Signer;

    const certInfo = (await signer.execute('ParseCertificate', certificate)) as { certBeginTime?: string | number | Date };

    const expiring = checkExpiringDate(certInfo);

    if (!expiring) return;

    actions.addMessage(
      new Message(
        expiring === '0'
          ? t('UserCertificateExpiringDay')
          : t('UserCertificateExpiring', {
              days: moment().add(expiring as never, 'days').fromNow()
            }),
        'permanentWarning',
        false,
        false,
        () => {
          try {
            const { certBeginTime } = certInfo;
            const expiringDates = localStorage.getItem('checkExpiringDate');

            const expiringDatesUpdate = JSON.parse(expiringDates || '[]');

            expiringDatesUpdate.push(new Date(certBeginTime as never).getTime());

            localStorage.setItem('checkExpiringDate', JSON.stringify(expiringDatesUpdate));
          } catch (e) {
            console.warn('Invalid certificate', e);
          }
        }
      ) as never
    );
  };

  componentDidMount = async () => {
    const { actions } = this.props;

    if (!this.application.type) {
      this.setState({ error: new Error('ApplicationTypeNotDefined') });
      return;
    }

    try {
      const pingResult = (await actions.ping()) as { message?: string; processPid?: unknown };
      const { message, processPid } = pingResult;

      if (message !== 'pong' || !processPid) {
        throw Error();
      }

      processList.set('init', this.init);
      window.addEventListener('focus', this.onFocus);
    } catch (e) {
      void e;
      this.setState({ error: new Error('ConnectionFailed') });
    }
  };

  componentDidUpdate = () => {
    processList.hasOrSet('init', this.init);
  };

  componentWillUnmount = () => {
    window.removeEventListener('focus', this.onFocus);
  };

  checkRedirect = (url?: string) => {
    const route = window.location.href.replace(window.location.origin, '');
    if (url || route.includes('/tasks/create')) {
      storage.setItem('redirectURL', url || route);
    }
  };

  render = () => {
    const { error } = this.state;
    const {
      children,
      serviceMessage,
      auth: { info, userUnits }
    } = this.props;

    if (serviceMessage) {
      return <ServiceMessage error={serviceMessage as never} />;
    }

    if (error) {
      if (error.message === '403 forbidden') {
        return <ServiceMessage error={new Error('NoPermissionIp') as never} />;
      }

      if (error.message === '401 unauthorized') {
        return <LoginScreen />;
      }

      if (error.message === 'AuthProcessError') {
        return <ServiceMessage error={error as never} canSwitchUser={true} logoutText={'Logout'} />;
      }

      return <ServiceMessage error={error as never} />;
    }

    if (!this.isInitialized()) {
      return <BlockScreen open={true} transparentBackground={true} />;
    }

    if (info && access && !checkAccess(access as never, info as never, userUnits as never)) {
      return <ServiceMessage error={new Error('NoPermission') as never} />;
    }

    if ((userUnits as AuthUnit[]).length === 1 && this.nullUnitIds.includes((userUnits as AuthUnit[])[0].id) && !info?.edrpou) {
      return <ServiceMessage canSwitchUser={true} error={new Error('NoUnitFound') as never} />;
    }

    if (
      this.enabledUnitId &&
      userUnits &&
      !(userUnits as AuthUnit[]).some((unit) => unit.id === this.enabledUnitId)
    ) {
      return <ServiceMessage canSwitchUser={true} error={new Error('NoEnableUnit') as never} />;
    }

    return (
      <>
        {children}
        <ChangePassword info={info as never} />
      </>
    );
  };
}

const mapStateToProps = ({ auth, app, errors: { serviceMessage } }: {
  auth: AuthState;
  app: { navigationTree?: unknown; navigationTreeLoaded?: boolean };
  errors: { serviceMessage?: Error | null };
}) => ({
  auth,
  app,
  serviceMessage
});
const appInitActions = getInitActions() as unknown as Record<string, (...args: unknown[]) => unknown>;
const mapDispatchToProps = (dispatch: Dispatch) => ({
  dispatch,
  actions: {
    ping: bindActionCreators(ping, dispatch),
    requestAuth: bindActionCreators(requestAuth, dispatch),
    requestUnits: bindActionCreators(requestUnits, dispatch),
    requestUserInfo: bindActionCreators(requestUserInfo, dispatch),
    requestTestCode: bindActionCreators(requestTestCode, dispatch),
    requestAllUnits: bindActionCreators(requestAllUnits, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    requestUserSettings: bindActionCreators(requestUserSettings, dispatch),
    getLocalizationTexts: bindActionCreators(getLocalizationTexts, dispatch),
    getLocalizationLanguages: bindActionCreators(getLocalizationLanguages, dispatch)
  },
  initActions: Object.keys(appInitActions).reduce(
    (acc, initAction) => ({
      ...acc,
      [initAction]: bindActionCreators(appInitActions[initAction] as never, dispatch)
    }),
    {}
  )
});

const translated = translate('Errors')(Auth as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;

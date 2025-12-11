import React from 'react';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
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
import { access, getInitActions } from 'application';
import ServiceMessage from 'components/Auth/ServiceMessage';
import checkExpiringDate from 'helpers/checkExpiringDate';
import edsService from 'services/eds';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import ChangePassword from 'components/ChangePassword';
import { requestUserSettings } from '../../actions/auth';

class Auth extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };

    const {
      application,
      application: { type: applicationType = 'manager' } = {},
      nullUnitIds = [],
      enabledUnitId
    } = getConfig();

    this.application = application;
    this.applicationType = applicationType;
    this.nullUnitIds = nullUnitIds;
    this.enabledUnitId = enabledUnitId;
  }

  onFocus = () => {
    const {
      auth: { info }
    } = this.props;
    const token = storage.getItem('token');

    if (!token || !info) return;

    try {
      const { userId } = jwtDecode(token);

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
      const langCode = storage.getItem('lang');

      await actions.getLocalizationLanguages();

      if (langCode) {
        await actions.getLocalizationTexts(langCode);
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
    } = queryString.parse(window.location.search);

    const backUrl = storage.getItem('backUrl');
    const signature = storage.getItem('cabState');

    let finalState = state && state === signature && state;

    if (testToken) storage.setItem('token', testToken);

    if (redirectUri && !finalState) {
      let signature = generatePassword(20, false);
      storage.setItem('cabState', signature);
      finalState = signature;
    }

    if (userInfo || error) return;

    let auth;
    this.checkRedirect(redirectUri);

    try {
      auth = await actions.requestAuth(code, finalState);
      storage.removeItem('cabState');

      if (auth instanceof Error) {
        throw auth;
      }

      if (!auth) {
        throw new Error('AuthProcessError');
      }

      if (this.applicationType === 'adminpanel' && !settings) {
        await actions.requestUserSettings();
      }
    } catch (e) {
      this.setState({ error: e });
      return;
    }

    await this.getLocalizationTexts();
    if (!units) {
      const request =
        await actions[this.application.type === 'manager' ? 'requestUnits' : 'requestAllUnits']();

      if (request instanceof Error) {
        this.setState({ error: request });
        return;
      }
    }

    Object.keys(initActions).forEach((initAction) => {
      const getCountsMethod = ['getMyUnreadTaskCount', 'getUnitUnreadTaskCount'];
      const hasMyTaskNoAccess = (auth.userUnits || []).every(
        (unit) => !unit.menuConfig?.navigation?.tasks?.InboxTasks
      );
      const hasUnitNoAccess = (auth.userUnits || []).every(
        (unit) => !unit.menuConfig?.navigation?.tasks?.UnitInboxTasks
      );
      if ((hasMyTaskNoAccess || hasUnitNoAccess) && getCountsMethod.includes(initAction)) {
        return;
      }
      processList.hasOrSet(initAction, initActions[initAction]);
    });

    this.checkCertificateExpiring(auth.onboardingTaskId);
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
      auth: { info, userUnits, settings }
    } = this.props;
    const { type = 'manager' } = this.application || {};

    const checkObjects = [info, userUnits];

    if (type === 'adminpanel') {
      checkObjects.push(settings);
    }

    return checkObjects.every(Boolean);
  };

  checkCertificateExpiring = async (auth) => {
    const { actions, t } = this.props;

    const certificate = auth?.services?.eds?.data?.pem;

    if (!certificate) return;

    const signer = edsService.getSigner();

    const certInfo = await signer.execute('ParseCertificate', certificate);

    const expiring = checkExpiringDate(certInfo);

    if (!expiring) return;

    actions.addMessage(
      new Message(
        expiring === '0'
          ? t('UserCertificateExpiringDay')
          : t('UserCertificateExpiring', {
              days: moment().add(expiring, 'days').fromNow()
            }),
        'permanentWarning',
        false,
        false,
        () => {
          try {
            const { certBeginTime } = certInfo;
            const expiringDates = localStorage.getItem('checkExpiringDate');

            const expiringDatesUpdate = JSON.parse(expiringDates || '[]');

            expiringDatesUpdate.push(new Date(certBeginTime).getTime());

            localStorage.setItem('checkExpiringDate', JSON.stringify(expiringDatesUpdate));
          } catch (e) {
            console.warn('Invalid certificate', e);
          }
        }
      )
    );
  };

  componentDidMount = async () => {
    const { actions } = this.props;

    if (!this.application.type) {
      this.setState({ error: new Error('ApplicationTypeNotDefined') });
      return;
    }

    try {
      const pingResult = await actions.ping();
      const { message, processPid } = pingResult;

      if (message !== 'pong' || !processPid) {
        throw Error();
      }

      processList.set('init', this.init);
      window.addEventListener('focus', this.onFocus);
    } catch (e) {
      this.setState({ error: new Error('ConnectionFailed') });
    }
  };

  componentDidUpdate = () => {
    processList.hasOrSet('init', this.init);
  };

  componentWillUnmount = () => {
    window.removeEventListener('focus', this.onFocus);
  };

  checkRedirect = (url) => {
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
      return <ServiceMessage error={serviceMessage} />;
    }

    if (error) {
      if (error.message === '403 forbidden') {
        return <ServiceMessage error={new Error('NoPermissionIp')} />;
      }

      if (error.message === '401 unauthorized') {
        return <LoginScreen />;
      }

      if (error.message === 'AuthProcessError') {
        return <ServiceMessage error={error} canSwitchUser={true} logoutText={'Logout'} />;
      }

      return <ServiceMessage error={error} />;
    }

    if (!this.isInitialized()) {
      return <BlockScreen open={true} transparentBackground={true} />;
    }

    if (info && access && !checkAccess(access, info, userUnits)) {
      return <ServiceMessage error={new Error('NoPermission')} />;
    }

    if (userUnits.length === 1 && this.nullUnitIds.includes(userUnits[0].id) && !info.edrpou) {
      return <ServiceMessage canSwitchUser={true} error={new Error('NoUnitFound')} />;
    }

    if (
      this.enabledUnitId &&
      userUnits &&
      !userUnits.some((unit) => unit.id === this.enabledUnitId)
    ) {
      return <ServiceMessage canSwitchUser={true} error={new Error('NoEnableUnit')} />;
    }

    return (
      <>
        {children}
        <ChangePassword info={info} />
      </>
    );
  };
}

Auth.propTypes = {
  children: PropTypes.node,
  actions: PropTypes.object.isRequired,
  initActions: PropTypes.object,
  auth: PropTypes.object,
  serviceMessage: PropTypes.object
};

Auth.defaultProps = {
  children: null,
  auth: {},
  initActions: {},
  serviceMessage: null
};

const mapStateToProps = ({ auth, errors: { serviceMessage } }) => ({
  auth,
  serviceMessage
});
const appInitActions = getInitActions();
const mapDispatchToProps = (dispatch) => ({
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
      [initAction]: bindActionCreators(appInitActions[initAction], dispatch)
    }),
    {}
  )
});

const translated = translate('Errors')(Auth);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

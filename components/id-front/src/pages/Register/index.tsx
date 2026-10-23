import React, { Component, Suspense } from 'react';
import classNames from 'classnames';
import setComponentsId from 'helpers/setComponentsId';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import { Snackbar, Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { Styles } from '@mui/styles/withStyles';
import type { Theme } from '@mui/material/styles';
import style from 'assets/jss';
import { signUpConfirmation, getAuth } from 'actions/auth';
import Layout from 'layouts/topHeader';
import BlockScreen from 'components/BlockScreen';
import Preloader from 'components/Preloader';
import theme from 'themes';
import type { RootState } from 'store/types';

// PRESERVED BUG (live, in production): nothing defines a global `config` (the app reads its configuration
// through `getConfig()`), so reading it below throws `ReferenceError: config is not defined` when the page
// mounts. `componentDidMount` is async, so it is an unhandled rejection: `blockScreen` stays `true` and the
// block screen never closes, whatever `FORCE_REGISTER` is. TypeScript cannot compile an undeclared name, so
// it is declared here, ambiently: `declare` emits no code, so the compiled output still reads the same
// global and still throws the same way. Do not "fix" this by reading `getConfig()` without a decision;
// it would change what the register page does. Pinned in index.vitest.tsx.
declare const config: { FORCE_REGISTER?: unknown } | undefined;

// The user object from `GET /auth`.
type RegisterValues = Record<string, unknown>;

interface RegisterPageProps {
  t: Translate;
  classes: Record<string, string>;
  // `defaultProps` give `setId` (`setComponentsId('app')`) and `values` (`{}`) a value.
  setId: (elementName: string) => string;
  values?: RegisterValues;
}

interface RegisterPageState {
  values: RegisterValues;
  error: string | undefined;
  blockScreen: boolean;
  registerStarts: boolean;
  showPreloader: boolean;
}

interface SignUpResult {
  success?: boolean;
  redirect?: string;
  err?: string;
  message?: string;
}

// The theme (bpmn) does not define this optional flag, but a theme may; widened by assignment.
const optionalTheme: typeof theme & { centerActions?: boolean } = theme;

const RegisterForm = React.lazy(() => import('./components/RegisterForm'));

class RegisterPage extends Component<RegisterPageProps, RegisterPageState> {
  static defaultProps = {
    setId: setComponentsId('app'),
    values: {},
  };

  state: RegisterPageState = {
    // `defaultProps` make this `{}` when no `values` are passed.
    values: this.props.values as RegisterValues,
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

  // Deletes `agreement` from the object it is given, which is the `user` object held by the store (kept).
  handleSubmit = async (values: RegisterValues) => {
    delete values.agreement;

    this.setState({ blockScreen: true });

    const { FORCE_REGISTER } = config || {};

    const { success, redirect, err, message } = (await signUpConfirmation(values)) as SignUpResult;

    if (success) {
      return window.location.replace(redirect as string);
    }

    const error = message || err;

    if (error && FORCE_REGISTER) {
      window.location.href = '/logout';
    }

    if (!error) {
      await getAuth();
      const { success, redirect } = (await signUpConfirmation(values)) as SignUpResult;
      if (success) {
        return window.location.replace(redirect as string);
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
                <span id="message-id" {...({ name: error } as object)}>
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
            [classes.alignActions]: optionalTheme.centerActions,
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

const styled = withStyles(style as Styles<Theme, {}, string>)(RegisterPage);
const translated = translate('RegisterForm')(styled);

// `authorization` is not a slice of the root reducer (the slices are `auth` and `eds`), so `auth` is always
// `undefined` (and the page never reads it). Preserved.
function mapStateToProps(state: RootState) {
  return { auth: (state as RootState & { authorization?: unknown }).authorization };
}

export default connect(mapStateToProps)(translated);

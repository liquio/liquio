import React, { Component } from 'react';
import type { ReactNode } from 'react';
import setComponentsId from 'helpers/setComponentsId';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import StringElement from 'components/CustomInput/StringElement';
import { Button, TextField, Typography } from '@mui/material';
import type { ButtonProps, TypographyProps } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { Styles } from '@mui/styles/withStyles';
import type { Theme } from '@mui/material/styles';
import style from 'assets/jss';
import promiseChain from 'helpers/promiseChain';
import { getConfig } from 'helpers/configLoader';
import { checkPhoneExists, sendActivationCodeSMS, verifyActivationCodeSMS } from 'actions/auth';

const regex = /380(\d{9})/g;

const TIMER_VALUE = 59;

// The step headings use the MUI v4 variant `subheading`, which v5 no longer knows (it renders a `span`). Kept.
const subheading = 'subheading' as TypographyProps['variant'];

interface PhoneInputProps {
  t: Translate;
  classes: Record<string, string>;
  // Has a `defaultProps` entry (`setComponentsId('phone-input')`), so it is always set.
  setId: (elementName: string) => string;
  value?: string;
  error?: ReactNode;
  name?: string;
  checked?: boolean;
  label?: string;
  onChange: (event: { target: { value: string } }, callback?: () => void) => void;
  onCodeChange: (event: { target: { value: string } }) => void;
  handleNextStep: () => void;
}

interface PhoneInputState {
  checked: boolean | undefined;
  showActivation: boolean;
  code: string;
  value: string | undefined;
  error: ReactNode;
  codeError: ReactNode;
  timer: number;
  showPhoneConfirm: boolean | undefined;
  phoneError?: ReactNode;
}

class PhoneInput extends Component<PhoneInputProps, PhoneInputState> {
  static defaultProps = {
    setId: setComponentsId('phone-input'),
    checked: false,
    error: null,
    value: '',
    name: '',
    label: '',
  };

  constructor(props: PhoneInputProps) {
    super(props);
    const config = getConfig();
    const { SHOW_PHONE_CONFIRM } = config;
    this.state = {
      checked: this.props.checked,
      showActivation: false,
      code: '',
      value: this.props.value,
      error: this.props.error,
      codeError: null,
      timer: TIMER_VALUE,
      showPhoneConfirm: SHOW_PHONE_CONFIRM,
    };
  }

  componentWillReceiveProps({ error }: PhoneInputProps) {
    if (!this.state.error) {
      this.setState({ error });
    }
  }

  valid = (phone: string) => phone.match(regex);

  checkPhoneExists = async () => {
    const { t } = this.props;
    const { value } = this.state;

    const isValid = (value || '').length && this.valid(value as string);

    if (!isValid) {
      throw t('PHONE_INVALID');
    }

    const { text } = (await checkPhoneExists(value as string)) as { text?: string };

    if (text !== 'null') {
      throw t('PHONE_ALREADY_EXISTS');
    }
  };

  checkCodeValid = async () => {
    const { t } = this.props;
    const { code } = this.state;
    if (!code) {
      throw t('EMPTY_CODE_ERROR');
    }
  };

  verifyActivationCode = async () => {
    const { t } = this.props;
    const { value, code } = this.state;
    const result = await verifyActivationCodeSMS(value as string, code);

    if (result !== 'confirm') {
      throw t('ACTIVATION_CODE_INVALID');
    }
  };

  handleFinish = () => {
    const { onChange, onCodeChange, handleNextStep } = this.props;
    const { code } = this.state;

    onChange({ target: { value: this.state.value as string } }, () => {
      code && onCodeChange({ target: { value: this.state.code } });
    });

    handleNextStep();
  };

  handleToggleActivation = () =>
    promiseChain([this.checkPhoneExists, this.handleSendCode, () => this.setState({ showActivation: true })]).catch((error) =>
      this.setState({ error: error as ReactNode }),
    );

  handleChange = ({ target: { value } }: { target: { value: string } }) => {
    const { onChange } = this.props;
    this.setState({ checked: false, value, error: null });

    if (!this.state.showPhoneConfirm) {
      onChange && onChange({ target: { value } });
    }
  };

  handleChangeCode = ({ target: { value } }: { target: { value: string } }) => this.setState({ code: value, codeError: null });

  handleSendCode = async () => {
    const { t } = this.props;
    const { value } = this.state;
    this.startTimer();
    const result = await sendActivationCodeSMS(value as string);
    if (result === 'exist') {
      throw t('PHONE_ALREADY_EXISTS');
    }
  };

  handleNotNow = () =>
    promiseChain([
      this.checkPhoneExists,
      () => this.setState({ checked: true, error: null, showActivation: false, code: '' }, this.handleFinish),
    ]).catch((error) => this.setState({ error: error as ReactNode }));

  handleActivate = () =>
    promiseChain([
      this.checkCodeValid,
      this.verifyActivationCode,
      () => this.setState({ checked: true, showActivation: false }, this.handleFinish),
    ]).catch((error) => this.setState({ codeError: error as ReactNode }));

  startTimer = () => {
    this.setState({ timer: TIMER_VALUE });

    const timerCounter = setInterval(() => {
      let { timer } = this.state;

      if (timer === 0) {
        clearInterval(timerCounter);
        return;
      }
      timer--;
      this.setState({ timer });
    }, 1000);
  };

  renderResendCodeButton = () => {
    const { t, classes } = this.props;
    const { timer } = this.state;

    if (timer === 0) {
      return (
        <Button
          color="primary"
          onClick={this.handleSendCode}
          className={classes.resendButton}
          aria-label={t('RESEND_CODE')}
        >
          {t('RESEND_CODE')}
        </Button>
      );
    }

    return <Typography variant="caption">{t('ACTIVATION_CODE_HELPER', { timer: timer > 9 ? timer : `0${timer}` })}</Typography>;
  };

  renderActivation = () => {
    const { t, classes, setId } = this.props;
    const { code, codeError, value: phone } = this.state;

    return (
      <>
        <Typography variant={subheading}>{t('ACTIVATION_CODE_TITLE')}</Typography>

        <Typography variant="body2" className={classes.mb16}>
          {t('ACTIVATIONS_BY_PHONE_TEXT')}
        </Typography>

        <TextField
          variant="standard"
          name="code"
          value={code}
          error={!!codeError}
          helperText={codeError || this.renderResendCodeButton()}
          label={t('ACTIVATE_PHONE_CODE', { phone })}
          onChange={this.handleChangeCode}
          className={classes.textField}
          id={setId('code')}
          inputProps={{ maxLength: 6 }}
          autoFocus={true}
        />

        <Button
          variant="contained"
          color="primary"
          className={classes.fullWidth}
          onClick={this.handleActivate}
          id={setId('activate-button')}
          aria-label={t('ACTIVATE')}
        >
          {t('ACTIVATE')}
        </Button>
      </>
    );
  };

  renderActivationRequest = () => {
    const { t, setId } = this.props;
    const { value, checked, showActivation } = this.state;

    if (showActivation) {
      return null;
    }

    const showActivationRequest = this.valid(value as string) && !checked && !showActivation;

    const handleSendCode = () => {
      if (!showActivationRequest) {
        this.setState({ phoneError: t('INVALID_PHONE') });
        return;
      }

      this.setState({ phoneError: null });

      this.handleToggleActivation();
    };

    return (
      <Button
        variant="contained"
        color="primary"
        onClick={handleSendCode}
        id={setId('activate-button')}
        aria-label={t('ACTIVATE_BY_CODE')}
      >
        {t('ACTIVATE_BY_CODE')}
      </Button>
    );
  };

  renderNextButton = () => {
    const { t } = this.props;
    const { value } = this.state;
    const isValid = (value || '').length && this.valid(value as string);

    if (!isValid) {
      return null;
    }

    return (
      <Button variant="contained" color="primary" onClick={this.handleFinish} sx={{ mb: 1 }} aria-label={t('ACCEPT')}>
        {t('ACCEPT')}
      </Button>
    );
  };

  renderSkipButton = () => {
    const { t, setId, classes } = this.props;

    return (
      <Button
        variant="contained"
        color="primary"
        onClick={this.handleNotNow}
        id={setId('not-now-button')}
        // `laterButton` is a style object, not a map of class names, so MUI ignores it (kept).
        classes={classes.laterButton as unknown as ButtonProps['classes']}
      >
        {t('ACCEPT')}
      </Button>
    );
  };

  render = () => {
    const { t, name, label, setId, classes } = this.props;
    const { value, error, checked, showActivation, phoneError } = this.state;

    return (
      <>
        <StringElement
          disabled={showActivation || checked}
          error={error || phoneError}
          name={name}
          label={label}
          value={value || ''}
          onChange={this.handleChange}
          mask="380999999999"
          autoFocus={(!this.state.showPhoneConfirm && value) as boolean}
          setId={(elementName) => setId(`${name}-${elementName}`)}
          sample={t('INPUT_PHONE_HELPER')}
          className={classes.textField}
        />
        <div className={classes.stepActions}>
          {!this.state.showPhoneConfirm ? (
            <>{this.renderSkipButton()}</>
          ) : (
            <>
              {this.renderActivationRequest()}
              {showActivation && this.renderActivation()}
            </>
          )}
        </div>
      </>
    );
  };
}

const styled = withStyles(style as Styles<Theme, {}, string>)(PhoneInput);
export default translate('RegisterForm')(styled);

import React from 'react';
import PropTypes from 'prop-types';
import setComponentsId from 'helpers/setComponentsId';
import { translate } from 'react-translate';
import StringElement from 'components/CustomInput/StringElement';
import { Button, TextField, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import style from 'assets/jss';
import promiseChain from 'helpers/promiseChain';
import { verifyActivationCodeEmail, sendActivationCodeEmail } from 'actions/auth';

const regex =
  /^[A-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-z0-9](?:[A-z0-9-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9-]*[A-z0-9])?$/;

const regexDomain = /^((?!@(?:mail\.ua|ya\.ua|yandex\.ua|rambler\.ua))((?!\.(ru|su|рф)).))*$/;

const TIMER_VALUE = 59;

class EmailInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: this.props.checked || false,
      showActivation: false,
      code: '',
      value: this.props.value || '',
      error: this.props.error,
      codeError: null,
      timer: TIMER_VALUE,
    };
  }

  componentWillReceiveProps({ error }) {
    if (!this.state.error) {
      this.setState({ error });
    }
  }

  valid = (email) => email.match(regex);
  validDomain = (email) => email.match(regexDomain);

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
    const result = await verifyActivationCodeEmail(value, code);

    if (result !== 'confirm') {
      throw t('ACTIVATION_CODE_INVALID');
    }
  };

  handleFinish = () => {
    const { onChange, onCodeChange, handleNextStep } = this.props;

    onChange({ target: { value: this.state.value } }, () => {
      onCodeChange({ target: { value: this.state.code } });
    });

    handleNextStep();
  };

  handleToggleActivation = () =>
    promiseChain([this.handleSendCode, () => this.setState({ showActivation: true })]).catch((error) => this.setState({ error }));

  handleChange = ({ target: { value } }) => this.setState({ checked: false, value, error: null });

  handleChangeCode = ({ target: { value } }) => this.setState({ code: value, codeError: null });

  handleSendCode = async () => {
    const { t } = this.props;
    const { value } = this.state;
    this.startTimer();
    const result = await sendActivationCodeEmail(value);
    if (result === 'exist') {
      throw t('EMAIL_ALREADY_EXISTS');
    }
  };

  handleActivate = () =>
    promiseChain([
      this.checkCodeValid,
      this.verifyActivationCode,
      () => this.setState({ checked: true, showActivation: false }, this.handleFinish),
    ]).catch((error) => this.setState({ codeError: error }));

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
          setId={(elementName) => setId(`resend-button-${elementName}`)}
        >
          {t('RESEND_CODE')}
        </Button>
      );
    }

    return <Typography variant="caption">{t('ACTIVATION_CODE_HELPER', { timer: timer > 9 ? timer : `0${timer}` })}</Typography>;
  };

  renderActivation = () => {
    const { t, classes, setId } = this.props;
    const { code, codeError, value: email } = this.state;

    return (
      <>
        <Typography variant="subheading">{t('ACTIVATION_CODE_TITLE')}</Typography>

        <Typography variant="body2" className={classes.mb16}>
          {t('ACTIVATIONS_BY_EMAIL_TEXT', { email })}
        </Typography>

        <TextField
          variant="standard"
          name="code"
          margin="none"
          value={code}
          error={!!codeError}
          helperText={codeError || this.renderResendCodeButton()}
          label={t('ACTIVATION_CODE_TEXT', { email: email })}
          onChange={this.handleChangeCode}
          id={setId('code')}
          inputProps={{ maxLength: 6 }}
          autoFocus={true}
          className={classes.textField}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={this.handleActivate}
          id={setId('activate-button')}
          setId={(elementName) => setId(`activate-button-${elementName}`)}
          aria-label={t('VERIFY_CODE')}
        >
          {t('VERIFY_CODE')}
        </Button>
      </>
    );
  };

  renderActivationRequest = () => {
    const { t, setId } = this.props;
    const { showActivation, value, checked } = this.state;

    if (showActivation) {
      return null;
    }

    const showActivationRequest = this.valid(value || '') && !checked && !showActivation;
    const isValidDomain = this.validDomain(value || '');

    const handleSendCode = () => {
      if (!showActivationRequest) {
        this.setState({ emailError: t('INVALID_EMAIL') });
        return;
      }

      if (!isValidDomain) {
        this.setState({ emailError: t('INVALID_DOMAIN') });
        return;
      }

      this.setState({ emailError: null });

      this.handleToggleActivation();
    };

    return (
      <Button
        variant="contained"
        color="primary"
        onClick={handleSendCode}
        id={setId('activate-button')}
        setId={(elementName) => setId(`activate-button-${elementName}`)}
        aria-label={t('ACTIVATE_BY_CODE')}
      >
        {t('ACTIVATE_BY_CODE')}
      </Button>
    );
  };

  render = () => {
    const { t, classes, name, label, setId } = this.props;
    const { value, error, checked, showActivation, emailError } = this.state;

    return (
      <>
        <StringElement
          disabled={showActivation || checked}
          error={error || emailError}
          name={name}
          label={label}
          value={value || ''}
          setId={(elementName) => setId(`${name}-${elementName}`)}
          onChange={this.handleChange}
          sample={t('EMAIL_HELPER')}
          className={classes.textField}
          autoFocus={true}
        />

        {this.renderActivationRequest()}

        {showActivation && this.renderActivation()}
      </>
    );
  };
}

EmailInput.propTypes = {
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  value: PropTypes.string,
  error: PropTypes.object,
  name: PropTypes.string,
  checked: PropTypes.bool,
  label: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onCodeChange: PropTypes.func.isRequired,
};

EmailInput.defaultProps = {
  setId: setComponentsId('email-input'),
  checked: false,
  error: null,
  value: '',
  name: '',
  label: '',
};

const styled = withStyles(style)(EmailInput);
export default translate('RegisterForm')(styled);

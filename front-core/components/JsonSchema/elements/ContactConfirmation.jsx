import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import objectPath from 'object-path';
import moment from 'moment';
import queue from 'queue';
import { FormControl, TextField, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

import processList from 'services/processList';

import {
  sendSMSCode,
  verifySMSCode,
  checkPhoneExists,
  sendEmailCode,
  verifyEmailCode,
  checkEmail,
  onlyVerifyEmailCode,
} from 'actions/auth';

import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import padWithZeroes from 'helpers/padWithZeroes';

import ProgressLine from 'components/Preloader/ProgressLine';
import BlockQuote from 'components/BlockQuote';
import IntervalUpdateComponent from 'components/IntervalUpdateComponent';
import { ChangeEvent } from 'components/JsonSchema';

import EJVError from '../components/EJVError';
import FieldLabel from '../components/FieldLabel';
import { getConfig } from 'helpers/configLoader';

const styles = {
  textField: {
    marginBottom: 10,
    maxWidth: 600,
  },
  flex: {
    display: 'flex',
  },
  resend: {
    fontSize: 12,
    lineHeight: '22px',
    letterSpacing: '-0.02em',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  wait: {
    opacity: 0.7,
    fontSize: 12,
    lineHeight: '16px',
    letterSpacing: '-0.02em',
  },
};

const CODE_LENGTH = 6;

class ContactConfirmation extends React.Component {
  constructor(props) {
    super(props);

    this.config = getConfig();

    this.state = {
      handlingError: null,
      error: null,
      busy: false,
      inited: false,
      tabFocused: false,
    };
    this.queue = queue({ autostart: true, concurrency: 1 });
  }

  get codeLength() {
    return this.config?.confirmationCodeLength || CODE_LENGTH;
  }

  componentDidMount() {
    this.init();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('mousedown', this.handleMouseDown);
  }

  componentDidUpdate() {
    this.init();
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('mousedown', this.handleMouseDown);
  }

  handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      this.setState({ tabFocused: true });
    }
  };

  handleMouseDown = () => {
    this.setState({ tabFocused: false });
  };

  init = async () => {
    const { inited } = this.state;

    if (inited) {
      return;
    }

    const { value, userInfo, onChange } = this.props;
    const { contact: newContact, type } = this.getContact();
    const { contact: oldContact, confirmed } = value || {};

    if (
      userInfo[type] === newContact &&
      (userInfo.valid[type] || type === 'email')
    ) {
      if (!confirmed) {
        await onChange.bind(null, 'confirmed')(new ChangeEvent(true, true));
      }
      this.setState({ inited: true });
      return;
    }

    if (oldContact !== newContact) {
      processList.hasOrSet('sendConfirmationCode', this.sendConfirmationCode);
    } else {
      this.setState({ inited: true });
    }
  };

  sendConfirmationCode = async () => {
    const { importActions, onChange, actions, onlyConfirm } = this.props;
    const { contact, type } = this.getContact();

    this.setState({ busy: true });

    let result;

    switch (type) {
      case 'phone': {
        const exists = await importActions.checkPhoneExists(contact);
        const { isExist } = exists;

        if (isExist) {
          this.setState({
            handlingError: new Error('PhoneIsAlreadyExists'),
            inited: true,
          });
          actions &&
            actions.blockForwardNavigation &&
            actions.blockForwardNavigation(true);
          return;
        }

        result = await importActions.sendSMSCode(contact);
        break;
      }
      case 'email': {
        if (!onlyConfirm) {
          const { isExist, isAllowed } =
            await importActions.checkEmail(contact);

          if (isExist) {
            this.setState({
              handlingError: new Error('EmailIsAlreadyExists'),
              inited: true,
            });
            actions &&
              actions.blockForwardNavigation &&
              actions.blockForwardNavigation(true);
            return;
          }

          if (isAllowed === false) {
            this.setState({
              handlingError: new Error('EmailNotAuthorized'),
              inited: true,
            });
            actions &&
              actions.blockForwardNavigation &&
              actions.blockForwardNavigation(true);
            return;
          }
        }

        result = await importActions.sendEmailCode(contact);
        break;
      }
      default:
        break;
    }

    if (result instanceof Error) {
      this.setState({
        handlingError: new Error('FailToSendVerifyCode'),
        inited: true,
      });
      return;
    }

    onChange({
      contact,
      lastSending: new Date().getTime(),
      confirmation: null,
    });
    this.setState({ busy: false, inited: true });
  };

  checkConfirmationCode = (code) => {
    const { t, importActions, onChange, onlyConfirm } = this.props;
    const { contact, type } = this.getContact();

    switch (type) {
      case 'phone': {
        return async () => {
          const result = await importActions.verifySMSCode(contact, code);
          if (result instanceof Error) {
            return;
          }

          const confirmed = result.isConfirmed;

          if (confirmed === false) {
            this.setState({
              error: new Error(t('FailToValidateCode')),
              inited: true,
            });
            return;
          }

          if (confirmed) {
            this.queue.stop();
            onChange.bind(null, 'code')(new ChangeEvent(code, true));
            onChange.bind(null, 'confirmed')(new ChangeEvent(confirmed, true));
          }
        };
      }
      case 'email': {
        return async () => {
          let result;

          if (onlyConfirm) {
            result = await importActions.onlyVerifyEmailCode(contact, code);
          } else {
            result = await importActions.verifyEmailCode(contact, code);
          }

          if (result instanceof Error) {
            this.setState({
              error: new Error(t('FailToValidateCode')),
              inited: true,
            });
            return;
          }

          const confirmed = result.isAccepted;

          if (confirmed === false) {
            this.setState({
              error: new Error(t('FailToValidateCode')),
              inited: true,
            });
            return;
          }

          if (confirmed) {
            this.queue.stop();
            onChange.bind(null, 'code')(new ChangeEvent(code, true));
            onChange.bind(null, 'confirmed')(new ChangeEvent(confirmed, true));
          }
        };
      }
      default:
        return async () => null;
    }
  };

  getContact = () => {
    const { contact = {}, rootDocument } = this.props;
    const { source = '', type = 'phone' } = contact;
    const value = objectPath.get(rootDocument.data, source);
    return { contact: value, type };
  };

  handleChange = ({ target: { value: code } }) => {
    const { onChange } = this.props;
    onChange.bind(null, 'code')(code);
    if (code.length === this.codeLength) {
      this.queue.push(this.checkConfirmationCode(code));
    }
  };

  renderCountDown = () => {
    const { t, classes, value } = this.props;
    const { busy } = this.state;

    if (busy) {
      return null;
    }

    const timeDelta = moment(value.lastSending)
      .add(60, 'seconds')
      .diff(moment());
    const duration = moment.duration(timeDelta);

    if (duration.asSeconds() < 0) {
      return (
        <div className={classes.flex}>
          <MailOutlineIcon />
          <Typography
            tabIndex={0}
            variant="body1"
            className={classes.resend}
            onClick={this.sendConfirmationCode}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.sendConfirmationCode();
              }
            }}
          >
            {t('SendAnotherCode')}
          </Typography>
        </div>
      );
    }

    return (
      <Typography variant="body1" className={classes.wait}>
        {t('SendAnotherCodeCounDown', {
          counter: [
            duration.minutes(),
            padWithZeroes(duration.seconds(), 2),
          ].join(':'),
        })}
      </Typography>
    );
  };

  componentWillUnmount = () => {
    const { actions } = this.props;
    actions &&
      actions.blockForwardNavigation &&
      actions.blockForwardNavigation(false);
  };

  render() {
    const { handlingError, error, busy, inited } = this.state;
    const {
      t,
      classes,
      description,
      readOnly,
      width,
      path,
      value,
      autoFocus,
      errors,
      actions,
    } = this.props;
    const { type, contact } = this.getContact();

    if (!inited) {
      return <ProgressLine loading={true} />;
    }

    if (handlingError) {
      return (
        <BlockQuote
          variant="error"
          title={t(handlingError.message, { contact })}
        />
      );
    }

    if (value.confirmed) {
      errors && errors.length && actions.clearErrors();
      return (
        <BlockQuote
          variant="success"
          title={t(
            [type, 'confirnmation', 'success']
              .map(capitalizeFirstLetter)
              .join(''),
          )}
        />
      );
    }

    return (
      <FormControl
        variant="standard"
        fullWidth={true}
        className={classes.formControl}
        style={{ width }}
      >
        <BlockQuote
          variant="warning"
          title={t(
            [type, 'confirnmation'].map(capitalizeFirstLetter).join(''),
            { contact },
          )}
        />
        <TextField
          variant="standard"
          autoFocus={autoFocus}
          className={classes.textField}
          label={
            description ? (
              <FieldLabel
                description={type === 'phone' ? t('SmsCode') : t('EmailCode')}
                required={true}
              />
            ) : null
          }
          onChange={this.handleChange}
          sx={{
            '& .MuiInputBase-input:focus[data-tab-focused="true"]': {
              outline: 'none',
            },
            '& .MuiInputBase-input:focus[data-tab-focused="true"]': {
              outline: '3px solid #0073E6',
              outlineOffset: '2px',
            },
          }}
          disabled={readOnly || busy}
          helperText={error ? <EJVError error={error} /> : null}
          error={!!error}
          id={path.concat('input').join('-')}
          value={value.code || ''}
          inputProps={{ maxLength: this.codeLength, minLength: this.codeLength, 'data-tab-focused': this.state.tabFocused }}
          onInput={(e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value) {
              e.target.value = Math.max(0, parseInt(e.target.value, 10))
                .toString()
                .slice(0, this.codeLength);
            }
          }}
        />
        <IntervalUpdateComponent render={this.renderCountDown} />
      </FormControl>
    );
  }
}

ContactConfirmation.propTypes = {
  value: PropTypes.object,
  actions: PropTypes.object.isRequired,
  errors: PropTypes.array.isRequired,
  onlyConfirm: PropTypes.bool,
};

ContactConfirmation.defaultProps = {
  value: {},
  onlyConfirm: false,
};

const mapStateToProps = ({ auth: { info } }) => ({ userInfo: info });

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    sendSMSCode: bindActionCreators(sendSMSCode, dispatch),
    verifySMSCode: bindActionCreators(verifySMSCode, dispatch),
    checkPhoneExists: bindActionCreators(checkPhoneExists, dispatch),
    sendEmailCode: bindActionCreators(sendEmailCode, dispatch),
    verifyEmailCode: bindActionCreators(verifyEmailCode, dispatch),
    checkEmail: bindActionCreators(checkEmail, dispatch),
    onlyVerifyEmailCode: bindActionCreators(onlyVerifyEmailCode, dispatch),
  },
});

const styled = withStyles(styles)(ContactConfirmation);
const translated = translate('Elements')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

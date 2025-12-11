import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  FormControl,
  TextField,
  Button,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { bindActionCreators } from 'redux';
import { sendSMSCode, verifySMSCode, setAuthMode } from 'actions/auth';
import promiseChain from 'helpers/promiseChain';
import customInputStyle from './styles';

class TwoFactorModal extends React.Component {
  state = { codeSended: false, code: '', error: null };

  onChangeCode = ({ target }) =>
    this.setState({ code: target.value, error: null });

  onClose = () => {
    const { onClose } = this.props;
    onClose();
    this.setState({ codeSended: false, code: '', error: null });
  };

  sendSMSCode = () => {
    const { actions } = this.props;
    this.setState({ codeSended: true }, () =>
      actions.sendSMSCode(this.props.phone),
    );
  };

  verifySMSCode = () => {
    const { t, phone, actions } = this.props;
    const { code } = this.state;
    return promiseChain([
      () => actions.verifySMSCode(phone, code),
      ({ isConfirmed }) => {
        if (!isConfirmed) {
          throw new Error(t('ValidationFalse'));
        }
      },
      () => actions.setAuthMode({ useTwoFactorAuth: true }),
      this.onClose,
    ]).catch((error) => this.setState({ error }));
  };

  renderContent() {
    const { t, classes, phone } = this.props;
    const { code, error, codeSended } = this.state;
    if (codeSended) {
      return (
        <Fragment>
          <DialogContentText>{t('TextWaitForSMSCode')}</DialogContentText>

          <FormControl
            variant="standard"
            fullWidth={true}
            className={classes.formControl}
            margin="dense"
          >
            <TextField
              variant="standard"
              placeholder={t('CodeInputLabel')}
              value={code}
              helperText={error && error.message}
              error={!!error}
              onChange={this.onChangeCode}
            />
          </FormControl>
          <Button
            onClick={this.verifySMSCode}
            variant="contained"
            color="primary"
            disabled={false}
            autoFocus={true}
          >
            {t('VerifyCode')}
          </Button>
          <div>
            <Button
              style={{ cursor: 'pointer', color: '#0059aa' }}
              onClick={this.sendSMSCode}
            >
              {t('ResendSMS')}
            </Button>
          </div>
        </Fragment>
      );
    }

    return (
      <Fragment>
        <DialogContentText>{t('TwoFactorAuthText')}</DialogContentText>
        <DialogContentText>{t('ConfirmText')}</DialogContentText>
        <DialogContentText
          style={{ textAlign: 'center', fontSize: 24, color: '#000' }}
        >
          +{phone}
        </DialogContentText>
        <Button
          onClick={this.sendSMSCode}
          variant="contained"
          color="primary"
          disabled={false}
          autoFocus={true}
        >
          {t('SendSMS')}
        </Button>
      </Fragment>
    );
  }

  render() {
    const { t, open, classes } = this.props;

    return (
      <Dialog
        open={open}
        onClose={this.onClose}
        aria-labelledby="title"
        aria-describedby="content"
        className={classes.dialog}
      >
        <DialogTitle className={classes.dialogContentWrappers}>
          {t('TwoFactorAuthTitle')}
        </DialogTitle>
        <DialogContent className={classes.dialogContentWrappers}>
          {this.renderContent()}
        </DialogContent>
      </Dialog>
    );
  }
}

TwoFactorModal.propTypes = {
  t: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  phone: PropTypes.string,
};

TwoFactorModal.defaultProps = {
  phone: '',
};

const translated = translate('UserProfile')(TwoFactorModal);
const styled = withStyles(customInputStyle)(translated);
const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    sendSMSCode: bindActionCreators(sendSMSCode, dispatch),
    verifySMSCode: bindActionCreators(verifySMSCode, dispatch),
    setAuthMode: bindActionCreators(setAuthMode, dispatch),
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(styled);

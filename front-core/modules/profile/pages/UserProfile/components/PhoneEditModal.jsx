import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
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
import StringElement from 'components/JsonSchema/elements/StringElement';
import { bindActionCreators } from 'redux';
import { sendSMSCode, checkPhoneExists, verifySMSCode } from 'actions/auth';
import promiseChain from 'helpers/promiseChain';
import { connect } from 'react-redux';
import customInputStyle from './styles';
import theme from 'theme';

class PhoneEditModal extends React.Component {
  state = { codeSended: false, phone: '', code: '', error: null };

  onChangeCode = ({ target }) =>
    this.setState({ code: target.value, error: null });

  onChangePhone = (value) => this.setState({ phone: value, error: null });

  onClose = () => {
    const { onClose } = this.props;
    onClose();
    this.setState({ codeSended: false, phone: '', code: '', error: null });
  };

  sendSMSCode = () => {
    const { t, actions } = this.props;
    const { phone } = this.state;
    return (
      phone &&
      promiseChain([
        () => actions.checkPhoneExists(phone),
        ({ isExist }) =>
          isExist
            ? Promise.reject(new Error(t('PhoneAlreadyExists')))
            : Promise.resolve(),
        () => this.setState({ codeSended: true, error: null }),
        () => actions.sendSMSCode(phone),
      ]).catch((error) => this.setState({ error }))
    );
  };

  verifySMSCode = () => {
    const { onChange, t, actions } = this.props;
    const { code, phone } = this.state;
    promiseChain([
      () => actions.verifySMSCode(phone, code),
      ({ isConfirmed }) => {
        if (!isConfirmed) {
          throw new Error(t('ValidationFalse'));
        }
        onChange(phone);
        this.onClose();
      },
    ]).catch((error) => this.setState({ error }));
  };

  savePhone = () => {
    const { onChange } = this.props;
    const { phone } = this.state;
    onChange(phone);
    this.onClose();
  };

  renderContent() {
    const { t, classes } = this.props;
    const { code, phone, error, codeSended } = this.state;
    const { skipPhoneVerification } = theme;
    if (codeSended) {
      return (
        <>
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
            disabled={!!error || !code}
            autoFocus={true}
          >
            {t('VerifyCode')}
          </Button>
          <div>
            <Button
              style={{ cursor: 'pointer', color: '#0059aa' }}
              onClick={this.sendSMSCode}
              href=""
            >
              {t('ResendSMS')}
            </Button>
          </div>
        </>
      );
    }

    return (
      <Fragment>
        {skipPhoneVerification ? (
          <DialogContentText>
            {t('PhoneDialogTextWithoutCode')}
          </DialogContentText>
        ) : (
          <DialogContentText>{t('PhoneDialogText')}</DialogContentText>
        )}
        <FormControl
          variant="standard"
          fullWidth={true}
          className={classes.formControl}
          margin="dense"
        >
          <StringElement
            description={t('PhoneInputLabel')}
            value={phone}
            error={error}
            onChange={this.onChangePhone}
            mask="380999999999"
          />
        </FormControl>
        {skipPhoneVerification ? (
          <Button
            onClick={this.savePhone}
            variant="contained"
            color="primary"
            disabled={!!error || !phone || phone.length < 12}
            autoFocus={true}
          >
            {t('SavePhone')}
          </Button>
        ) : (
          <Button
            onClick={this.sendSMSCode}
            variant="contained"
            color="primary"
            disabled={!!error || !phone || phone.length < 12}
            autoFocus={true}
          >
            {t('SendSMS')}
          </Button>
        )}
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
          {t('PhoneDialogTitle')}
        </DialogTitle>
        <DialogContent className={classes.dialogContentWrappers}>
          {this.renderContent()}
        </DialogContent>
      </Dialog>
    );
  }
}

PhoneEditModal.propTypes = {
  t: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

const translated = translate('UserProfile')(PhoneEditModal);
const styled = withStyles(customInputStyle)(translated);

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    sendSMSCode: bindActionCreators(sendSMSCode, dispatch),
    checkPhoneExists: bindActionCreators(checkPhoneExists, dispatch),
    verifySMSCode: bindActionCreators(verifySMSCode, dispatch),
  },
});
export default connect(mapStateToProps, mapDispatchToProps)(styled);

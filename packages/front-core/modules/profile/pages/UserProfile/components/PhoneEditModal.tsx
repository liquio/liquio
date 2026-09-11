import React, { Fragment } from 'react';
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
import { bindActionCreators, Dispatch } from 'redux';
import { sendSMSCode, checkPhoneExists, verifySMSCode } from 'actions/auth';
import promiseChain from 'helpers/promiseChain';
import { connect } from 'react-redux';
import customInputStyle from './styles';
import theme from 'theme';

const rawTheme = theme as unknown as { skipPhoneVerification?: boolean };

interface PhoneEditModalProps {
  t: (key: string) => string;
  open: boolean;
  onChange: (phone: string) => void;
  classes: Record<string, string>;
  onClose: () => void;
  actions: {
    sendSMSCode: (phone: string) => Promise<unknown>;
    checkPhoneExists: (phone: string) => Promise<{ isExist?: boolean }>;
    verifySMSCode: (phone: string, code: string) => Promise<{ isConfirmed?: boolean }>;
  };
}

interface PhoneEditModalState {
  codeSended: boolean;
  phone: string;
  code: string;
  error: Error | null;
}

class PhoneEditModal extends React.Component<PhoneEditModalProps, PhoneEditModalState> {
  state: PhoneEditModalState = { codeSended: false, phone: '', code: '', error: null };

  onChangeCode = ({ target }: { target: { value: string } }) =>
    this.setState({ code: target.value, error: null });

  onChangePhone = (value: string) => this.setState({ phone: value, error: null });

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
      promiseChain(
        [
          () => actions.checkPhoneExists(phone),
          ({ isExist }: { isExist?: boolean }) =>
            isExist
              ? Promise.reject(new Error(t('PhoneAlreadyExists')))
              : Promise.resolve(),
          () => this.setState({ codeSended: true, error: null }),
          () => actions.sendSMSCode(phone),
        ] as never,
      ).catch((error: Error) => this.setState({ error }))
    );
  };

  verifySMSCode = () => {
    const { onChange, t, actions } = this.props;
    const { code, phone } = this.state;
    promiseChain(
      [
        () => actions.verifySMSCode(phone, code),
        ({ isConfirmed }: { isConfirmed?: boolean }) => {
          if (!isConfirmed) {
            throw new Error(t('ValidationFalse'));
          }
          onChange(phone);
          this.onClose();
        },
      ] as never,
    ).catch((error: Error) => this.setState({ error }));
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
    const { skipPhoneVerification } = rawTheme;
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
              className={classes.linkButton}
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
            error={error as never}
            onChange={this.onChangePhone as never}
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

const translated = translate('UserProfile')(PhoneEditModal as never);
const styled = withStyles(customInputStyle)(translated as never);

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    sendSMSCode: bindActionCreators(sendSMSCode, dispatch),
    checkPhoneExists: bindActionCreators(checkPhoneExists, dispatch),
    verifySMSCode: bindActionCreators(verifySMSCode, dispatch),
  },
});
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;

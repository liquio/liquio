import React, { Fragment } from 'react';
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
import { bindActionCreators, Dispatch } from 'redux';
import { sendSMSCode, verifySMSCode, setAuthMode } from 'actions/auth';
import promiseChain from 'helpers/promiseChain';
import customInputStyle from './styles';

interface TwoFactorModalProps {
  t: (key: string) => string;
  open: boolean;
  classes: Record<string, string>;
  onClose: () => void;
  phone?: string;
  actions: {
    sendSMSCode: (phone: string) => Promise<unknown>;
    verifySMSCode: (phone: string, code: string) => Promise<{ isConfirmed?: boolean }>;
    setAuthMode: (mode: unknown) => Promise<unknown>;
  };
}

interface TwoFactorModalState {
  codeSended: boolean;
  code: string;
  error: Error | null;
}

class TwoFactorModal extends React.Component<TwoFactorModalProps, TwoFactorModalState> {
  static defaultProps = {
    phone: '',
  };

  state: TwoFactorModalState = { codeSended: false, code: '', error: null };

  onChangeCode = ({ target }: { target: { value: string } }) =>
    this.setState({ code: target.value, error: null });

  onClose = () => {
    const { onClose } = this.props;
    onClose();
    this.setState({ codeSended: false, code: '', error: null });
  };

  sendSMSCode = () => {
    const { actions } = this.props;
    this.setState({ codeSended: true }, () =>
      actions.sendSMSCode(this.props.phone as string),
    );
  };

  verifySMSCode = () => {
    const { t, phone, actions } = this.props;
    const { code } = this.state;
    return promiseChain(
      [
        () => actions.verifySMSCode(phone as string, code),
        ({ isConfirmed }: { isConfirmed?: boolean }) => {
          if (!isConfirmed) {
            throw new Error(t('ValidationFalse'));
          }
        },
        () => actions.setAuthMode({ useTwoFactorAuth: true }),
        this.onClose,
      ] as never,
    ).catch((error: Error) => this.setState({ error }));
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
              className={classes.linkButton}
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
          className={classes.centeredText}
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

const translated = translate('UserProfile')(TwoFactorModal as never);
const styled = withStyles(customInputStyle)(translated as never);
const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    sendSMSCode: bindActionCreators(sendSMSCode, dispatch),
    verifySMSCode: bindActionCreators(verifySMSCode, dispatch),
    setAuthMode: bindActionCreators(setAuthMode, dispatch),
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;

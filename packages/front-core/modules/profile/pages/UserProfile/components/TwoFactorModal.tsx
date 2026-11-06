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
  mode?: 'enable' | 'disable';
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
    mode: 'enable',
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
    const { actions, mode, phone } = this.props;
    if (mode === 'disable') {
      // The code is bound to the current phone; show the server error if it can not be sent.
      return Promise.resolve(actions.sendSMSCode(phone as string)).then((result) => {
        if (result instanceof Error) {
          return this.setState({ error: result });
        }
        return this.setState({ codeSended: true, error: null });
      });
    }
    this.setState({ codeSended: true }, () =>
      actions.sendSMSCode(this.props.phone as string),
    );
    return undefined;
  };

  disableTwoFactor = () => {
    const { actions } = this.props;
    const { code } = this.state;
    return promiseChain(
      [
        () => actions.setAuthMode({ useTwoFactorAuth: false, code }),
        this.onClose,
      ] as never,
    ).catch((error: Error) => this.setState({ error }));
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
    const { t, classes, phone, mode } = this.props;
    const { code, error, codeSended } = this.state;
    const isDisable = mode === 'disable';
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
            onClick={isDisable ? this.disableTwoFactor : this.verifySMSCode}
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
        <DialogContentText>
          {t(isDisable ? 'TwoFactorAuthDisableText' : 'TwoFactorAuthText')}
        </DialogContentText>
        <DialogContentText>
          {t(isDisable ? 'ConfirmDisableText' : 'ConfirmText')}
        </DialogContentText>
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
        {error ? (
          <DialogContentText color="error">{error.message}</DialogContentText>
        ) : null}
      </Fragment>
    );
  }

  render() {
    const { t, open, classes, mode } = this.props;

    return (
      <Dialog
        open={open}
        onClose={this.onClose}
        aria-labelledby="title"
        aria-describedby="content"
        className={classes.dialog}
      >
        <DialogTitle className={classes.dialogContentWrappers}>
          {t(mode === 'disable' ? 'TwoFactorAuthDisableTitle' : 'TwoFactorAuthTitle')}
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

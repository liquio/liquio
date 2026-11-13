import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { translate, Translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Button,
} from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import { sendSMSCode, verifySMSCode } from 'actions/auth';

import promiseChain from 'helpers/promiseChain';

const styles = {
  validateBtn: {
    margin: 0,
    padding: '0 10px',
  },
};

interface ValidatePhoneMessageProps {
  auth: { info: { phone?: string; valid?: { phone?: boolean } } };
  handleClose: () => void;
  t: Translate;
  classes: Record<string, string>;
  actions: {
    sendSMSCode: (phone: string) => Promise<unknown>;
    verifySMSCode: (phone: string, code: string) => Promise<{ isConfirmed?: boolean }>;
  };
}

interface ValidatePhoneMessageState {
  open: boolean;
  validated: boolean;
  error: string | Error | null;
  code: string;
}

class ValidatePhoneMessage extends React.Component<ValidatePhoneMessageProps, ValidatePhoneMessageState> {
  componentWillReceiveProps({
    handleClose,
    auth: {
      info: { valid },
    },
  }: ValidatePhoneMessageProps) {
    const { phone: phoneIsValid } = valid || {};
    if (phoneIsValid) handleClose();
  }

  state: ValidatePhoneMessageState = { open: false, validated: false, error: null, code: '' };

  handleValidate = () => {
    const {
      t,
      actions,
      auth: {
        info: { phone },
      },
    } = this.props;
    const { code } = this.state;
    if (!code) {
      return this.setState({ error: t('ValidationFalse') });
    }

    return promiseChain(
      [
        () => actions.verifySMSCode(phone as string, code),
        ({ isConfirmed }: { isConfirmed?: boolean }) => {
          if (!isConfirmed) {
            throw new Error(t('ValidationFalse'));
          }
          this.setState({ validated: true });
        },
      ] as never,
    ).catch((error: Error) => this.setState({ error }));
  };

  handleChangeCode = ({ target: { value } }: { target: { value: string } }) =>
    this.setState({ code: value, error: null });

  handleOpenDialog = () =>
    this.setState({ open: true }, () => {
      const {
        actions,
        auth: {
          info: { phone },
        },
      } = this.props;
      actions.sendSMSCode(phone as string);
    });

  render() {
    const { open, validated, error } = this.state;
    const {
      t,
      classes,
      handleClose,
      auth: { info },
    } = this.props;
    const phone = (info || {}).phone || '';
    return (
      <Fragment>
        {t('PhoneValidationNeeded', {
          actions: (
            <Button
              variant="contained"
              color="primary"
              disabled={open}
              className={classes.validateBtn}
              onClick={this.handleOpenDialog}
            >
              {t('ValidatePhone')}
            </Button>
          ),
        })}
        <Dialog open={open} aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">
            {t('ValidatePhoneTitle')}
          </DialogTitle>
          <DialogContent>
            {validated ? (
              <DialogContentText>
                {t('ValidatePhoneSuccess', { phone })}
              </DialogContentText>
            ) : (
              <Fragment>
                <DialogContentText>
                  {t('ValidatePhoneMessage', { phone })}
                </DialogContentText>
                <TextField
                  variant="standard"
                  error={!!error}
                  label={error && (error as Error).message}
                  autoFocus={true}
                  margin="dense"
                  fullWidth={true}
                  onChange={this.handleChangeCode}
                />
              </Fragment>
            )}
          </DialogContent>
          <DialogActions>
            {validated ? (
              <Button
                onClick={() => this.setState({ open: false }, handleClose)}
              >
                {t('Close')}
              </Button>
            ) : (
              <Fragment>
                <Button onClick={() => this.setState({ open: false })}>
                  {t('Cancel')}
                </Button>
                <Button onClick={this.handleValidate}>{t('Validate')}</Button>
              </Fragment>
            )}
          </DialogActions>
        </Dialog>
      </Fragment>
    );
  }
}

const mapStateToProps = ({ auth }: { auth: ValidatePhoneMessageProps['auth'] }) => ({ auth });

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    sendSMSCode: bindActionCreators(sendSMSCode, dispatch),
    verifySMSCode: bindActionCreators(verifySMSCode, dispatch),
  },
});

const translated = translate('UserProfile')(ValidatePhoneMessage as never);
const styled = withStyles(styles)(translated as never);
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;

import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

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

class ValidatePhoneMessage extends React.Component {
  componentWillReceiveProps({
    handleClose,
    auth: {
      info: { valid },
    },
  }) {
    const { phone: phoneIsValid } = valid || {};
    if (phoneIsValid) handleClose();
  }

  state = { open: false, validated: false, error: null, code: '' };

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

    return promiseChain([
      () => actions.verifySMSCode(phone, code),
      ({ isConfirmed }) => {
        if (!isConfirmed) {
          throw new Error(t('ValidationFalse'));
        }
        this.setState({ validated: true });
      },
    ]).catch((error) => this.setState({ error }));
  };

  handleChangeCode = ({ target: { value } }) =>
    this.setState({ code: value, error: null });

  handleOpenDialog = () =>
    this.setState({ open: true }, () => {
      const {
        actions,
        auth: {
          info: { phone },
        },
      } = this.props;
      actions.sendSMSCode(phone);
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
                  label={error && error.message}
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

ValidatePhoneMessage.propTypes = {
  auth: PropTypes.object.isRequired,
  handleClose: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
};

const mapStateToProps = ({ auth }) => ({ auth });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    sendSMSCode: bindActionCreators(sendSMSCode, dispatch),
    verifySMSCode: bindActionCreators(verifySMSCode, dispatch),
  },
});

const translated = translate('UserProfile')(ValidatePhoneMessage);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);

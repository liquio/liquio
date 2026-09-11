/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Button, CircularProgress, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import StringElement from 'components/JsonSchema/elements/StringElement';
import EmailIcon from 'assets/img/ic_email.svg';

const styles = () => ({
  buttonProgress: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  icon: {
    color: 'green',
  },
  buttonRoot: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 0,
    borderRadius: 0,
    borderBottom: '1px solid transparent',
    '&:hover': {
      background: 'transparent',
      borderBottom: '1px solid #000',
    },
  },
  buttonLabel: {
    fontSize: 12,
    lineHeight: '16px',
  },
  expandIcon: {
    position: 'relative',
    left: -3,
  },
  actionButtonlabel: {
    padding: '10px!important',
    fontSize: 14,
  },
  actionButtonRoot: {
    marginLeft: 15,
    minWidth: 190,
  },
  groupWrapper: {
    position: 'relative',
    marginBottom: 31,
  },
  flex: {
    display: 'flex',
    alignItems: 'flex-start',
    '&>div': {
      margin: 0,
    },
    '&>span>div': {
      margin: 0,
    },
  },
  btnLoader: {
    position: 'absolute',
    left: '50%',
    marginLeft: -12,
  },
});

const PaymentLayout = ({
  t,
  classes,
  loading,
  loadingValue,
  isSuccess,
  sendCode,
  sendPhone,
  resendCode,
  onChangeCode,
  onChangePhone,
  phoneExists,
  phone,
  code,
  phoneNotValid,
  codeNotValid,
  isConfirmed,
  checkPaymentStatus,
  ...rest
}) => (
  <>
    {loadingValue && (
      <CircularProgress size={24} className={classes.buttonProgress} />
    )}
    {!isSuccess && !phoneExists && (
      <div className={classes.flex}>
        <StringElement
          {...rest}
          description={t('Phone')}
          value={phone}
          onChange={onChangePhone}
          required={true}
          error={phoneNotValid && { message: t('PhoneValidationMessage') }}
          mask="380999999999"
        />
        <Button
          onClick={sendPhone}
          size="large"
          color="primary"
          variant="contained"
          disabled={loading}
          classes={{
            label: classes.actionButtonlabel,
            root: classes.actionButtonRoot,
          }}
          aria-label={t('GetCode')}
        >
          {t('GetCode')}
          {loading && (
            <CircularProgress size={24} className={classes.buttonProgress} />
          )}
        </Button>
      </div>
    )}
    {!isSuccess && phoneExists && (
      <div
        className={classes.flex}
        style={{
          alignItems: isConfirmed ? 'center' : 'flex-start',
        }}
      >
        <span>
          <StringElement
            {...rest}
            description={t('SmsCode')}
            value={code}
            onChange={onChangeCode}
            required={true}
            readOnly={isConfirmed}
            error={codeNotValid && { message: t('CodeValidationMessage') }}
          />
          {!isConfirmed ? (
            <Button
              onClick={resendCode}
              disabled={loading}
              classes={{
                label: classes.buttonLabel,
                root: classes.buttonRoot,
              }}
              aria-label={t('Resend')}
            >
              <img
                src={EmailIcon}
                alt="resend"
                width={16}
                style={{ marginRight: 8 }}
              />
              {t('Resend')}
            </Button>
          ) : null}
        </span>
        {isConfirmed ? (
          <Button
            onClick={checkPaymentStatus}
            classes={{ label: classes.buttonLabel }}
            disabled={loading}
            style={{ marginLeft: 10 }}
            aria-label={t('RefreshPaymentStatus')}
          >
            {loading && (
              <CircularProgress size={24} className={classes.btnLoader} />
            )}
            <RefreshIcon className={classes.refreshIcon} />
            {t('RefreshPaymentStatus')}
          </Button>
        ) : (
          <Button
            onClick={sendCode}
            size="large"
            color="primary"
            variant="contained"
            disabled={loading}
            classes={{
              label: classes.actionButtonlabel,
              root: classes.actionButtonRoot,
            }}
            aria-label={t('SendCode')}
          >
            {t('SendCode')}
            {loading && (
              <CircularProgress size={24} className={classes.buttonProgress} />
            )}
          </Button>
        )}
      </div>
    )}
    {isSuccess && (
      <div style={{ display: 'flex', marginTop: 15 }}>
        <Typography variant={'body2'}>{t('Paid')}</Typography>
        <CheckRoundedIcon className={classes.icon} />
      </div>
    )}
  </>
);

PaymentLayout.propTypes = {
  t: PropTypes.func.isRequired,
  checkPaymentStatus: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  isSuccess: PropTypes.bool,
  description: PropTypes.string,
  loadingValue: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.object,
  required: PropTypes.bool,
  sample: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  sendCode: PropTypes.func.isRequired,
  sendPhone: PropTypes.func.isRequired,
  resendCode: PropTypes.func.isRequired,
  onChangeCode: PropTypes.func.isRequired,
  onChangePhone: PropTypes.func.isRequired,
  phoneExists: PropTypes.bool,
  phone: PropTypes.string,
  code: PropTypes.string,
  phoneNotValid: PropTypes.bool,
  codeNotValid: PropTypes.bool,
  isConfirmed: PropTypes.bool,
};

PaymentLayout.defaultProps = {
  isSuccess: false,
  description: '',
  error: null,
  required: false,
  loadingValue: false,
  loading: false,
  sample: '',
  phoneExists: false,
  phone: '',
  code: '',
  phoneNotValid: false,
  codeNotValid: false,
  isConfirmed: false,
};

const translated = translate('Elements')(PaymentLayout);
const styled = withStyles(styles)(translated);
export default styled;

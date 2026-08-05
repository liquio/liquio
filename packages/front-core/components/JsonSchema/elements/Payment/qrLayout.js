import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Button, CircularProgress, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';

const styles = (theme) => ({
  buttonProgress: {
    boxSizing: 'content-box',
    padding: 10,
  },
  icon: {
    color: 'green',
  },
  refreshIcon: {
    position: 'relative',
    left: -5,
  },
  buttonRoot: {
    position: 'relative',
    left: -20,
  },
  flex: {
    display: 'flex',
    marginTop: 10,
  },
  description: {
    fontSize: 20,
    marginBottom: 20,
  },
  groupWrapper: {
    position: 'relative',
    marginBottom: 23,
  },
  qrCodeImage: {
    width: 220,
    height: 220,
    position: 'relative',
    left: -3,
    display: 'block',
  },
  btnLoader: {
    position: 'absolute',
    left: '50%',
    marginLeft: -12,
  },
  errorText: {
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
    },
  },
});

const PaymentLayout = ({
  t,
  description,
  classes,
  loadingValue,
  loading,
  isSuccess,
  paymentRequestData,
  checkPaymentStatus,
  inited,
}) => (
  <>
    {!loadingValue ? (
      <>
        {description && (
          <Typography variant="body1" classes={{ body1: classes.description }}>
            {description}
          </Typography>
        )}
        {paymentRequestData ? (
          <>
            {!isSuccess && (
              <img
                src={`data:image/svg+xml;base64,${paymentRequestData.qrCode}`}
                className={classes.qrCodeImage}
                alt={'payment-qr-code-link'}
              />
            )}
            {isSuccess ? (
              <div className={classes.flex}>
                <Typography variant={'body2'}>{t('Paid')}</Typography>
                <CheckRoundedIcon className={classes.icon} />
              </div>
            ) : (
              <Button
                onClick={checkPaymentStatus}
                classes={{ label: classes.buttonLabel }}
                disabled={loading}
                aria-label={t('RefreshPaymentStatus')}
              >
                {loading && (
                  <CircularProgress size={24} className={classes.btnLoader} />
                )}
                <RefreshIcon className={classes.refreshIcon} />
                {t('RefreshPaymentStatus')}
              </Button>
            )}
          </>
        ) : null}
        {inited && !paymentRequestData ? (
          <>
            <WarningIcon style={{ color: '#d32f2f' }} />
            <Typography className={classes.errorText} variant={'body2'}>
              {t('QRError')}
            </Typography>
          </>
        ) : null}
      </>
    ) : (
      <CircularProgress size={24} className={classes.buttonProgress} />
    )}
  </>
);

PaymentLayout.propTypes = {
  t: PropTypes.func.isRequired,
  checkPaymentStatus: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  paymentRequestData: PropTypes.object,
  isSuccess: PropTypes.bool,
  description: PropTypes.string,
  loadingValue: PropTypes.bool,
  error: PropTypes.object,
  required: PropTypes.bool,
  loading: PropTypes.bool,
  inited: PropTypes.bool,
  sample: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

PaymentLayout.defaultProps = {
  isSuccess: false,
  description: '',
  error: null,
  required: false,
  loadingValue: false,
  loading: false,
  inited: false,
  sample: '',
  paymentRequestData: null,
};

const translated = translate('Elements')(PaymentLayout);
const styled = withStyles(styles)(translated);
export default styled;

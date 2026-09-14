import React from 'react';
import { translate, Translate } from 'react-translate';
import { Button, CircularProgress, Typography } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';

const styles = (theme: Theme) => ({
  buttonProgress: {
    boxSizing: 'content-box' as const,
    padding: 10,
  },
  icon: {
    color: 'green',
  },
  refreshIcon: {
    position: 'relative' as const,
    left: -5,
  },
  buttonRoot: {
    position: 'relative' as const,
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
    position: 'relative' as const,
    marginBottom: 23,
  },
  qrCodeImage: {
    width: 220,
    height: 220,
    position: 'relative' as const,
    left: -3,
    display: 'block',
  },
  btnLoader: {
    position: 'absolute' as const,
    left: '50%',
    marginLeft: -12,
  },
  errorText: {
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
    },
  },
});

interface PaymentRequestData {
  qrCode?: string;
  [key: string]: unknown;
}

interface QrLayoutProps extends WithStyles<typeof styles> {
  t: Translate;
  description?: string;
  loadingValue?: boolean;
  loading?: boolean;
  isSuccess?: boolean;
  paymentRequestData?: PaymentRequestData | null;
  checkPaymentStatus: () => void;
  inited?: boolean;
  [key: string]: unknown;
}

const PaymentLayout = ({
  t,
  description = '',
  classes,
  loadingValue = false,
  loading = false,
  isSuccess = false,
  paymentRequestData = null,
  checkPaymentStatus,
  inited = false,
}: QrLayoutProps) => (
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
                // `label` isn't a real MUI v5 ButtonClasses key (removed from v4), and
                // `buttonLabel` was never defined in `styles` above either — both parts
                // of this silently no-op today. Preserved as-is.
                classes={{ label: (classes as unknown as { buttonLabel?: string }).buttonLabel } as Record<string, string>}
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

const translated = translate('Elements')(PaymentLayout);
const styled = withStyles(styles)(translated);
export default styled;

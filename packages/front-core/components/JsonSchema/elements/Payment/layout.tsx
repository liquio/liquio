/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate, Translate } from 'react-translate';
import { Button, InputAdornment, CircularProgress } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import classNames from 'classnames';
import { Theme } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import StringElement from 'components/JsonSchema/elements/StringElement';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ProgressLine from 'components/Preloader/ProgressLine';

const styles = (theme: Theme) => ({
  groupWrapper: {
    marginTop: 10,
  },
  wrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  field: {
    position: 'relative' as const,
    marginRight: 15,
    '&>div': {
      marginBottom: 0,
    },
  },
  buttonProgress: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  icon: {
    color: 'green',
  },
  progressLine: {
    marginBottom: 10,
  },
  actionButton: {
    ...((theme as unknown as { paymentSuccessButton?: object }).paymentSuccessButton || {}),
  },
});

interface PaymentLayoutProps extends WithStyles<typeof styles> {
  t: Translate;
  paymentValue?: string | number;
  loading?: boolean;
  loadingValue?: boolean;
  paymentAction: () => void;
  isSuccess?: boolean;
  description?: string;
  hidden?: boolean;
  error?: unknown;
  required?: boolean;
  sample?: string | boolean;
  [key: string]: unknown;
}

const PaymentLayout = ({
  t,
  classes,
  paymentValue = 0,
  loading = false,
  loadingValue = false,
  paymentAction,
  isSuccess = false,
  ...rest
}: PaymentLayoutProps) => (
  <>
    <div
      className={classNames({
        [classes.wrapper]: true,
        [classes.progressLine]: loading,
      })}
    >
      <span className={classNames(classes.field, classes.flex2)}>
        <StringElement
          {...rest}
          description={t('amountText')}
          readOnly={'true'}
          required={true}
          value={String(paymentValue)}
          InputProps={{
            // MUI requires a `position` prop on InputAdornment (missing here in the
            // original too); omitting it still renders, just without MUI's position-based
            // styling/warning suppressed. Preserved as-is via an empty prop spread.
            endAdornment: <InputAdornment {...({} as { position: 'start' | 'end' })}>{t('Currency')}</InputAdornment>,
          }}
        />
        {loadingValue && (
          <CircularProgress size={24} className={classes.buttonProgress} />
        )}
      </span>
      <Button
        onClick={paymentAction}
        color="primary"
        variant="contained"
        className={classNames({
          [classes.flex1]: true,
          [classes.actionButton]: isSuccess,
        })}
        disabled={loadingValue || loading || isSuccess}
        aria-label={isSuccess ? t('Paid') : t('MakePayment')}
        startIcon={isSuccess ? <CheckRoundedIcon /> : <CreditCardIcon />}
      >
        {isSuccess ? t('Paid') : t('MakePayment')}
      </Button>
    </div>

    <ProgressLine loading={loading} />
  </>
);

const translated = translate('Elements')(PaymentLayout);
const styled = withStyles(styles)(translated);
export default styled;

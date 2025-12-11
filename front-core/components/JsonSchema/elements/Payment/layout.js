/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Button, InputAdornment, CircularProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import StringElement from 'components/JsonSchema/elements/StringElement';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ProgressLine from 'components/Preloader/ProgressLine';

const styles = (theme) => ({
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
    position: 'relative',
    marginRight: 15,
    '&>div': {
      marginBottom: 0,
    },
  },
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
  progressLine: {
    marginBottom: 10,
  },
  actionButton: {
    ...(theme?.paymentSuccessButton || {}),
  },
});

const PaymentLayout = ({
  t,
  classes,
  paymentValue,
  loading,
  loadingValue,
  paymentAction,
  isSuccess,
  ...rest
}) => (
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
            endAdornment: <InputAdornment>{t('Currency')}</InputAdornment>,
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

PaymentLayout.propTypes = {
  t: PropTypes.func.isRequired,
  paymentAction: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  isSuccess: PropTypes.bool,
  description: PropTypes.string,
  hidden: PropTypes.bool,
  loadingValue: PropTypes.bool,
  loading: PropTypes.bool,
  paymentValue: PropTypes.string,
  error: PropTypes.object,
  required: PropTypes.bool,
  sample: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

PaymentLayout.defaultProps = {
  isSuccess: false,
  description: '',
  hidden: false,
  error: null,
  required: false,
  loadingValue: false,
  loading: false,
  sample: '',
  paymentValue: 0,
};

const translated = translate('Elements')(PaymentLayout);
const styled = withStyles(styles)(translated);
export default styled;

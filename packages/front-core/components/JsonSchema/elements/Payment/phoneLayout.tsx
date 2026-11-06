/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate, Translate } from 'react-translate';
import { Button, CircularProgress, Typography } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import StringElement from 'components/JsonSchema/elements/StringElement';
import EmailIcon from 'assets/img/ic_email.svg';

const styles = () => ({
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
    position: 'relative' as const,
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
    position: 'relative' as const,
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
    position: 'absolute' as const,
    left: '50%',
    marginLeft: -12,
  },
});

interface PhoneLayoutProps extends WithStyles<typeof styles> {
  t: Translate;
  loading?: boolean;
  loadingValue?: boolean;
  isSuccess?: boolean;
  sendCode: () => void;
  sendPhone: () => void;
  resendCode: () => void;
  onChangeCode: (value: string) => void;
  onChangePhone: (value: string) => void;
  phoneExists?: boolean;
  phone?: string;
  code?: string;
  phoneNotValid?: boolean;
  codeNotValid?: boolean;
  isConfirmed?: boolean;
  checkPaymentStatus: () => void;
  [key: string]: unknown;
}

const PaymentLayout = ({
  t,
  classes,
  loading = false,
  loadingValue = false,
  isSuccess = false,
  sendCode,
  sendPhone,
  resendCode,
  onChangeCode,
  onChangePhone,
  phoneExists = false,
  phone = '',
  code = '',
  phoneNotValid = false,
  codeNotValid = false,
  isConfirmed = false,
  checkPaymentStatus,
  ...rest
}: PhoneLayoutProps) => (
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
          } as Record<string, string>}
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
              } as Record<string, string>}
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
            classes={{ label: classes.buttonLabel } as Record<string, string>}
            disabled={loading}
            style={{ marginLeft: 10 }}
            aria-label={t('RefreshPaymentStatus')}
          >
            {loading && (
              <CircularProgress size={24} className={classes.btnLoader} />
            )}
            {/* `refreshIcon` was never defined in `styles` above — this silently
                no-ops today (no such classKey exists). Preserved as-is. */}
            <RefreshIcon className={(classes as unknown as { refreshIcon?: string }).refreshIcon} />
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
            } as Record<string, string>}
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

const translated = translate('Elements')(PaymentLayout);
const styled = withStyles(styles)(translated);
export default styled;

import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import * as clipboard from 'clipboard-polyfill';
import cleenDeep from 'clean-deep';
import classNames from 'classnames';
import QRCode from 'qrcode.react';
import MobileDetect from 'mobile-detect';
import { Typography, Button, Tab, Tabs } from '@mui/material';
import EastIcon from '@mui/icons-material/East';
import makeStyles from '@mui/styles/makeStyles';
import DoneIcon from '@mui/icons-material/Done';
import ReplayIcon from '@mui/icons-material/Replay';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ProgressLine from 'components/Preloader/ProgressLine';
import Disclaimer from 'components/Disclaimer';
import { getStripe, putStripe } from 'actions/stripe';
import diff from 'helpers/diff';
import { ReactComponent as CopyIcon } from './assets/copy.svg';

type AsyncDispatch = (thunk: unknown) => Promise<unknown>;

interface StripeValue {
  redirectUrl?: string;
  sessionId?: string;
  status?: string;
}

interface StripeKYCProps {
  required?: boolean;
  error?: unknown;
  width?: string | number;
  noMargin?: boolean;
  onChange: (value: unknown) => void;
  value?: StripeValue;
  actions?: { handleNextStep?: () => void };
  hideFinishButton?: boolean;
  hidden?: boolean;
}

const INTERVAL = 3000;

const useStyles = makeStyles(() => ({
  root: {
    border: '1px solid #E7EEF3',
    padding: 32,
    marginBottom: 32
  },
  description: {
    fontWeight: 400,
    fontSize: 28,
    lineHeight: '32px',
    marginBottom: 24
  },
  sample: {
    fontWeight: 400,
    fontSize: 16,
    lineHeight: '24px',
    marginBottom: 32
  },
  linkWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    marginTop: 32
  },
  flexItem: {
    flex: 9
  },
  label: {
    fontWeight: 400,
    fontSize: 12,
    lineHeight: '16px',
    letterSpacing: '-2%',
    color: '#545454'
  },
  link: {
    fontWeight: 400,
    fontSize: 16,
    lineHeight: '24px',
    letterSpacing: '-2%',
    borderBottom: '2px solid #000',
    width: '100%',
    wordBreak: 'break-word' as const,
    whiteSpace: 'normal' as const
  },
  copyButton: {
    fontSize: 13,
    backgroundColor: '#F1F1F1',
    padding: '10px 30px',
    borderRadius: 20,
    flex: 1
  },
  qrWrapper: {
    backgroundColor: '#F1F1F1',
    padding: 24,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 32
  },
  qrCode: {
    width: 200,
    height: 200,
    backgroundColor: '#fff',
    padding: 24,
    boxSizing: 'border-box' as const
  },
  mb0: {
    marginBottom: 10
  },
  mt40: {
    marginTop: 40
  }
}));

const StripeKYC = ({ required, error, width, noMargin, onChange, value, actions, hideFinishButton = false, hidden }: StripeKYCProps) => {
  const t = useTranslate('StripeKYC');
  const dispatch = useDispatch() as unknown as AsyncDispatch;
  const classes = useStyles();
  const [activeTab, setActiveTab] = React.useState(0);
  const [redirectUrl, setRedirectUrl] = React.useState(value?.redirectUrl);
  const [copied, setIsCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sessionId, setSessionId] = React.useState(value?.sessionId);
  const [success, setSuccess] = React.useState(false);
  const [stripeError, setError] = React.useState(false);
  const [unSuccess, setUnSuccess] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [response, setResponse] = React.useState<{ redirectUrl?: string; id?: string; status?: string; data?: { status?: string; last_error?: unknown } } | null>(null);
  const interval = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const handleCopy = React.useCallback((stringToCopy?: string) => {
    clipboard.writeText(stringToCopy || '').then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  }, []);

  const handleUpdateSession = React.useCallback(async () => {
    setLoading(true);

    if (interval.current) clearInterval(interval.current);

    interval.current = setInterval(async () => {
      if (!sessionId) return;

      const result = (await dispatch(putStripe(sessionId))) as { data?: { status?: string; last_error?: unknown } } | Error;

      setResponse(result as { redirectUrl?: string; id?: string; status?: string; data?: { status?: string; last_error?: unknown } });

      setLoading(false);

      const isError = result instanceof Error;

      if (isError) {
        setError(true);
      }

      const resultData = (isError ? {} : (result as { data?: { status?: string; last_error?: unknown } }).data) || {};

      const stop =
        ['verified', 'canceled', 'failed'].includes(resultData.status as string) || isError;

      if (stop) {
        if (interval.current) clearInterval(interval.current);
      }

      if (resultData.status === 'verified') {
        setSuccess(true);
      }

      if (resultData.status === 'canceled') {
        setUnSuccess(true);
      }

      if (resultData.status === 'failed' || resultData.last_error) {
        setError(true);
      }

      if (resultData.status === 'waiting') {
        setPending(true);
      }
    }, INTERVAL);
  }, [dispatch, sessionId]);

  const handleRedirect = React.useCallback(
    (url?: string) => {
      setPending(true);
      handleUpdateSession();
      // Original assumed window.open() never returns null (e.g. popup blockers);
      // cast rather than optional-chained to preserve that crash-on-null behavior.
      (window.open(url, '_blank') as Window).focus();
    },
    [handleUpdateSession]
  );

  const init = React.useCallback(async () => {
    setLoading(true);

    const result = (await dispatch(
      getStripe({
        returnUrl: window.location.href
      })
    )) as { redirectUrl?: string; id?: string };

    setRedirectUrl(result.redirectUrl);
    setSessionId(result.id);
    setLoading(false);
  }, [dispatch]);

  const reInit = React.useCallback(() => {
    setSuccess(false);
    setError(false);
    init();
    setSuccess(false);
    setUnSuccess(false);
    setError(false);
    setPending(false);
  }, [init]);

  React.useEffect(() => {
    if (value?.sessionId) return;
    init();
  }, [dispatch, init, value?.sessionId]);

  React.useEffect(() => {
    handleUpdateSession();
  }, [handleUpdateSession]);

  React.useEffect(() => {
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  React.useEffect(() => {
    const body = {
      redirectUrl: response?.redirectUrl,
      sessionId: response?.id,
      status: response?.status
    };

    const diffs = diff(cleenDeep(value as Record<string, unknown>) || null, cleenDeep(body) || null);

    if (!diffs || !response) return;

    onChange(body);
  }, [onChange, response, value]);

  if (hidden) return null;

  return (
    <ElementContainer required={required} error={error} width={width} noMargin={noMargin}>
      <ProgressLine loading={loading} />

      {success ? (
        <>
          <Typography variant={'h3'} className={classes.description}>
            {t('SuccessTitle')}
          </Typography>
          <Typography className={classes.sample}>{t('SuccessDescription')}</Typography>

          {hideFinishButton ? null : (
            <Button
              variant="contained"
              color="primary"
              endIcon={<EastIcon />}
              onClick={() => actions?.handleNextStep?.()}
            >
              {t('Proceed')}
            </Button>
          )}
        </>
      ) : null}

      {unSuccess ? (
        <>
          <Typography variant={'h3'} className={classes.description}>
            {t('VerificationUnsuccessful')}
          </Typography>
          <Typography className={classes.sample}>
            {t('VerificationUnsuccessfulDescription')}
          </Typography>

          <Typography variant={'h3'} className={classes.description}>
            {t('PossibleReasons')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('DocumentsNotAccepted')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('IdentityDetailsNotMatch')}
          </Typography>
          <Typography className={classNames(classes.sample)}>
            {t('VerificationIncomplete')}
          </Typography>

          <Typography variant={'h3'} className={classes.description}>
            {t('NextSteps')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('TryAgain')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('EnsureDetails')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('ContactSupport')}
          </Typography>

          <Button
            className={classNames(classes.copyButton, classes.mt40)}
            startIcon={<ReplayIcon />}
            onClick={reInit}
          >
            {t('RetryVerification')}
          </Button>
        </>
      ) : null}

      {stripeError ? (
        <>
          <Typography variant={'h3'} className={classes.description}>
            {t('ErrorTitle')}
          </Typography>
          <Typography className={classes.sample}>{t('ErrorDescription')}</Typography>

          <Typography variant={'h3'} className={classes.description}>
            {t('NextSteps')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('TryAgain')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('EnsureDetails')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('ContactSupport')}
          </Typography>

          <Button
            className={classNames(classes.copyButton, classes.mt40)}
            startIcon={<ReplayIcon />}
            onClick={reInit}
          >
            {t('RetryVerification')}
          </Button>
        </>
      ) : null}

      {![success, stripeError, unSuccess, loading].some(Boolean) && pending ? (
        <>
          <Typography variant={'h3'} className={classes.description}>
            {t('VerificationInProgress')}
          </Typography>
          <Typography className={classNames(classes.sample, classes.mb0)}>
            {t('VerificationInProgressDescription')}
          </Typography>

          <Button
            className={classNames(classes.copyButton, classes.mt40)}
            startIcon={<ReplayIcon />}
            onClick={reInit}
          >
            {t('RetryVerification')}
          </Button>
        </>
      ) : null}

      {[success, stripeError, unSuccess, loading, pending].some(Boolean) ? null : (
        <>
          <div className={classes.root}>
            <Typography variant={'h3'} className={classes.description}>
              {t('Description')}
            </Typography>
            <Typography className={classes.sample}>{t('Sample')}</Typography>

            {isMobile ? null : (
              <Tabs
                value={activeTab}
                indicatorColor="primary"
                textColor="primary"
                onChange={(_, tab) => setActiveTab(tab)}
              >
                <Tab label={t('CopyLink')} />
                <Tab label={t('GetQr')} />
              </Tabs>
            )}

            {activeTab === 0 ? (
              <>
                <Typography className={classes.sample}>{t('helperText')}</Typography>

                <Disclaimer text={t('Disclaimer')} noMargin={true} />

                <div className={classes.linkWrapper}>
                  <div className={classes.flexItem}>
                    <Typography className={classes.label}>{t('LinkText')}</Typography>
                    <Typography className={classes.link}>{redirectUrl}</Typography>
                  </div>
                  {/* `size` isn't a real SvgIconProps prop (MUI icons use `fontSize`) — this
                      silently no-ops today via a plain DOM attribute passthrough. Preserved as-is. */}
                  <Button
                    className={classes.copyButton}
                    onClick={() => handleCopy(redirectUrl)}
                    startIcon={copied ? <DoneIcon {...({ size: 16 } as Record<string, unknown>)} /> : <CopyIcon />}
                  >
                    {t('Copy')}
                  </Button>
                </div>
              </>
            ) : null}

            {activeTab === 1 ? (
              <div className={classes.qrWrapper}>
                <QRCode value={redirectUrl || ''} className={classes.qrCode} renderAs={'svg'} />
                <div className={classes.flexItem}>
                  <Typography>{t('QrTitle')}</Typography>
                  <Typography sx={{ mt: 2 }}>{t('QRDescription')}</Typography>
                </div>
              </div>
            ) : null}
          </div>

          <Button
            variant="contained"
            color="primary"
            endIcon={<EastIcon />}
            onClick={() => handleRedirect(redirectUrl)}
          >
            {t('Start')}
          </Button>
        </>
      )}
    </ElementContainer>
  );
};

export default StripeKYC;

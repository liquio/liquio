import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslate } from 'react-translate';
import QRCode from 'qrcode.react';
import { makeStyles } from '@mui/styles';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StringElement from 'components/JsonSchema/elements/StringElement';
import ProgressLine from 'components/Preloader/ProgressLine';
import Message from 'components/Snackbars/Message';
import {
  generateTOTP,
  enableTOTP,
  disableTOTP,
  requestUserInfo,
} from 'actions/auth';
import { addMessage } from 'actions/error';

const useStyles = makeStyles(() => ({
  subtitle: {
    fontSize: 28,
    marginBottom: 20,
    padding: 3
  },
  formGroup: {
    marginBottom: 20,
  },
  mb: {
    marginBottom: 40,
  },
  qr: {
    marginBottom: 20,
  },
  text: {
    marginBottom: 20,
    maxWidth: 640,
  },
  actions: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  copyIcon: {
    color: '#000',
  },
}));

const TwoFactorCode = () => {
  const t = useTranslate('TwoFactorCode');
  const dispatch = useDispatch();
  const classes = useStyles();

  const totp = useSelector((state) => state?.auth?.info?.twoFactorType);

  const [totpUri, setTotpUri] = React.useState(null);
  const [totpSecret, setTotpSecret] = React.useState(null);
  const [tfa, setTfa] = React.useState(totp === 'totp');
  const [pending, setPending] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [disabling, setDisabling] = React.useState(false);
  const [error, setError] = React.useState(null);
  const codeInputRef = React.useRef(null);

  const handleGenerateTfa = React.useCallback(async () => {
    setPending(true);

    const { success, secret, uri } = await dispatch(generateTOTP());

    setPending(false);

    if (!success) {
      dispatch(addMessage(new Message('TOTPGenerateError', 'error')));
      return;
    }

    setTotpUri(uri);
    setTotpSecret(secret);
    setTfa(true);
  }, []);

  const handleEnableTfa = React.useCallback(async () => {
    setPending(true);

    const { success } = await dispatch(enableTOTP(totpSecret, code));

    if (!success) {
      setError(true);
      setPending(false);
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 0);
      return;
    }

    await dispatch(requestUserInfo());

    dispatch(addMessage(new Message('TOTPEnabled', 'success')));

    setTotpUri(null);
    setTotpSecret(null);
    setPending(false);
  }, [totpSecret, dispatch, code]);

  const handleDisableTfa = React.useCallback(async () => {
    setPending(true);

    const { success } = await dispatch(disableTOTP(code));

    if (!success) {
      setError(true);
      setPending(false);
      return;
    }

    setTfa(false);

    setPending(false);

    setDisabling(false);
  }, [code, dispatch]);

  const handleChangeTfa = React.useCallback(
    async (event) => {
      setError(false);

      if (event.target.checked) {
        handleGenerateTfa();
      } else {
        setDisabling(true);
      }
    },
    [handleGenerateTfa],
  );

  const handleCopyToClipboard = React.useCallback((text) => {
    navigator.clipboard.writeText(text);
    dispatch(addMessage(new Message('TOTPCopied', 'success')));
  }, []);

  return (
    <>
      <Typography tabIndex={0} variant="h2" className={classes.subtitle}>
        {t('Security')}
      </Typography>

      <FormGroup className={classes.formGroup}>
        <FormControlLabel
          tabIndex={0}
          control={
            <Switch
              checked={tfa}
              onChange={handleChangeTfa}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleChangeTfa({ target: { checked: !tfa } });
                }
              }}
            />
          }
          label={t('TFA')}
        />
        <ProgressLine loading={pending} />
      </FormGroup>

      <Typography tabIndex={0} className={classes.text}>{t('TFADescription')}</Typography>

      {totpUri ? (
        <div className={classes.mb}>
          <Typography className={classes.text}>{t('QRDescription')}</Typography>

          <div className={classes.qr}>
            <QRCode value={totpUri} size={200} />
          </div>

          <Typography className={classes.text}>
            {t('Secret')}
            {': '}
            {totpSecret}{' '}
            <IconButton
              className={classes.copyIcon}
              onClick={() => handleCopyToClipboard(totpSecret)}
              aria-label={t('CopyKey')}
            >
              <ContentCopyIcon />
            </IconButton>
          </Typography>

          <Typography className={classes.text}>
            {t('CodeDescription')}
          </Typography>

          <div className={classes.actions}>
            <StringElement
              width={130}
              required={true}
              noMargin={true}
              value={code}
              placeholder={t('Code')}
              onChange={setCode}
              error={error ? { message: t('InvalidCode') } : null}
              inputRef={codeInputRef}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleEnableTfa}
            >
              {t('Enable')}
            </Button>
          </div>
        </div>
      ) : null}

      {disabling ? (
        <div className={classes.actions}>
          <StringElement
            width={130}
            required={true}
            noMargin={true}
            value={code}
            placeholder={t('Code')}
            onChange={setCode}
            error={error ? { message: t('InvalidCode') } : null}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleDisableTfa}
          >
            {t('Disable')}
          </Button>
        </div>
      ) : null}
    </>
  );
};

export default TwoFactorCode;

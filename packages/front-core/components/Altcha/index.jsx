import React from 'react';
import { useTranslate } from 'react-translate';
import { Dialog, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import 'altcha';

const useStyles = makeStyles(() => ({
  wrapper: {
    padding: '25px 20px',
    '& div.altcha': {
      borderRadius: 0,
      boxShadow: 'none',
      backgroundColor: 'transparent',
      border: 'none'
    },
    '& div.altcha-main': {
      paddingTop: 20,
      paddingLeft: 0,
      paddingBottom: 0,
      gap: 10,
      alignItems: 'self-start'
    }
  },
  title: {
    fontSize: 18
  }
}));

const Altcha = React.forwardRef(({ onStateChange, captcha }, ref) => {
  const t = useTranslate('Captcha');
  const widgetRef = React.useRef(null);
  const [value, setValue] = React.useState(null);
  const classes = useStyles();

  React.useImperativeHandle(
    ref,
    () => ({
      get value() {
        return value;
      }
    }),
    [value]
  );

  React.useEffect(() => {
    const handleStateChange = (ev) => {
      if ('detail' in ev) {
        setValue(ev.detail.payload || null);
        if (onStateChange) {
          onStateChange(ev);
        }
      }
    };

    const tryAddListener = () => {
      const current = widgetRef.current;

      if (current) {
        current.addEventListener('statechange', handleStateChange);
        return true;
      }
      return false;
    };

    const interval = setInterval(() => {
      if (tryAddListener()) {
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [onStateChange, captcha]);

  return (
    <Dialog open={true}>
      <div className={classes.wrapper}>
        <Typography className={classes.title}>{t('title')}</Typography>
        <altcha-widget
          ref={widgetRef}
          challengejson={JSON.stringify(captcha)}
          strings={JSON.stringify({
            ariaLinkLabel: t('ariaLinkLabel'),
            error: t('error'),
            expired: t('expired'),
            footer: t('footer'),
            label: t('label'),
            verified: t('verified'),
            verifying: t('verifying'),
            waitAlert: t('waitAlert')
          })}
          hidelogo
          hidefooter
        />
      </div>
    </Dialog>
  );
});

export default Altcha;

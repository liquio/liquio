import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import renderHTML from 'react-render-html';

import { getConfig } from 'helpers/configLoader';
import { ReactComponent as KeyIcon } from 'assets/img/ic_key.svg';
import WSOLogo from 'assets/img/wso2-logo.png';

const styles = (theme) => ({
  root: {
    display: 'flex',
    [theme.breakpoints.down('sm')]: {
      display: 'block',
    },
  },
  actions: {
    maxWidth: '320px',
    width: '100%',
    marginRight: '32px',
    [theme.breakpoints.down('sm')]: {
      maxWidth: 'none',
      marginRight: 0,
      marginBottom: '24px',
    },
  },
  title: {
    fontSize: '16px',
    fontWeight: theme?.loginTitle?.fontWeight || 500,
    lineHeight: '24px',
    letterSpacing: '0.15px',
    color: '#444444',
    marginBottom: '24px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '14px',
      lineHeight: '21px',
      letterSpacing: '0.1px',
      marginBottom: '16px',
    },
  },
  button: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: theme?.loginType?.fontWeight || 500,
    fontSize: theme?.loginType?.fontSize || '16px',
    lineHeight: '24px',
    letterSpacing: '0.15px',
    backgroundColor: theme?.loginType?.backgroundColor || '#F6F6F6',
    border: theme?.loginType?.border || '1px solid #F6F6F6',
    borderRadius: theme?.loginType?.borderRadius || '12px',
    padding: '11px 8px 11px 12px',
    maxHeight: 'none',
    width: '100%',
    '&:hover': {
      borderColor: theme?.loginType?.borderColor || '#000000',
      backgroundColor: theme?.loginType?.backgroundColor || '#F6F6F6',
    },
    '&:not(:last-child)': {
      marginBottom: '16px',
    },
    [theme.breakpoints.down('sm')]: {
      fontSize: '14px',
      lineHeight: '21px',
      letterSpacing: '0.1px',
      '&:not(:last-child)': {
        marginBottom: '8px',
      },
    },
  },
  buttonWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authMethodText: {
    paddingLeft: 12,
  },
  icon: {
    marginRight: '12px',
  },
  info: {
    backgroundColor: theme?.info?.backgroundColor || '#F2F7FF',
    padding: '24px 24px 32px 24px',
    borderRadius: theme?.info?.borderRadius || '4px',
    flex: 1,
    [theme.breakpoints.down('sm')]: {
      padding: '16px',
    },
  },
  infoTitle: {
    fontSize: '24px',
    lineHeight: '32px',
    marginBottom: '20px',
    fontWeight: 400,
    letterSpacing: 'normal',
    [theme.breakpoints.down('sm')]: {
      fontSize: '20px',
      lineHeight: '30px',
      marginBottom: '16px',
    },
  },
  infoContent: {
    fontSize: theme?.info?.fontSize || '16px',
    fontWeight: theme?.info?.fontWeight || 400,
    lineHeight: '24px',
    letterSpacing: '0.5px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '14px',
      lineHeight: '21px',
      letterSpacing: '0.5px',
    },
  },
  infoAdditionalContent: {
    fontSize: theme?.infoAdditionalContent?.fontSize || '16px',
    fontWeight: theme?.infoAdditionalContent?.fontWeight || 400,
    lineHeight: '24px',
    letterSpacing: '0.5px',
    marginTop: '24px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '14px',
      lineHeight: '21px',
      letterSpacing: '0.5px',
    },
  },
  authLogo: {
    maxWidth: '100px',
  },
});


const MainPage = ({ classes, t, setLoginByOwnKey, setCredentialMethod }) => {
  const config = getConfig();
  const { WSO2 = {} } = config;
  const chooseLoginByOwnKey = () => setLoginByOwnKey(true);
  const chooseLoginByCredentialMethod = (props) => setCredentialMethod(props || true);

  const handleRedirectWso2 = React.useCallback(() => {
    window.location.href = '/authorise/wso2';
  }, []);

  return (
    <div className={classes.root}>
      <div className={classes.actions}>
        <Button className={classes.button} onClick={chooseLoginByOwnKey}>
          <div className={classes.buttonWrapper}>
            <KeyIcon className={classes.icon}></KeyIcon>
            {t('keySign')}
          </div>
          <ChevronRightIcon></ChevronRightIcon>
        </Button>

        {WSO2 && WSO2.enabled && (
          <Button className={classes.button} onClick={handleRedirectWso2}>
            <div className={classes.buttonWrapper}>
              <img src={WSOLogo} className={classes.authLogo} alt="" />
            </div>
            <ChevronRightIcon></ChevronRightIcon>
          </Button>
        )}

        {config.passwordAuth ? (
          <Button className={classes.button} onClick={chooseLoginByCredentialMethod}>
            <div className={classes.buttonWrapper}>
              <KeyIcon className={classes.icon}></KeyIcon>
              {t('LoginAndPass')}
            </div>
            <ChevronRightIcon></ChevronRightIcon>
          </Button>
        ) : null}
      </div>
      <div className={classes.info}>
        <Typography className={classes.infoTitle}>{t('infoTitle')}</Typography>
        <Typography className={classes.infoContent}>{renderHTML(t('infoContent'))}</Typography>
      </div>
    </div>
  );
};

MainPage.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.func.isRequired,
  setLoginByOwnKey: PropTypes.func,
};

MainPage.defaultProps = {
  setLoginByOwnKey: () => null,
};

const styled = withStyles(styles)(MainPage);
export default translate('LoginPage')(styled);

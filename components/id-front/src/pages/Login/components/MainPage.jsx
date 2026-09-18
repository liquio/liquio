import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import renderHTML from 'react-render-html';

import { getAuthProviders } from 'helpers/authProvidersLoader';
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


const DEFAULT_TITLES = {
  local: 'LoginAndPass',
  x509: 'keySign',
};

const MainPage = ({ classes, t, setLoginByOwnKey, setCredentialMethod }) => {
  const providers = getAuthProviders();
  const chooseLoginByOwnKey = () => setLoginByOwnKey(true);
  const chooseLoginByCredentialMethod = (props) => setCredentialMethod(props || true);

  const handleProviderClick = (provider) => {
    if (provider.type === 'local') {
      return chooseLoginByCredentialMethod();
    }
    if (provider.type === 'x509') {
      return chooseLoginByOwnKey();
    }
    if (provider.url) {
      window.location.href = provider.url;
    }
    return undefined;
  };

  return (
    <div className={classes.root}>
      <div className={classes.actions}>
        {providers.map((provider) => {
          const titleKey = DEFAULT_TITLES[provider.type];
          const title = provider.title || (titleKey ? t(titleKey) : provider.id);

          return (
            <Button
              key={`${provider.type}-${provider.id}`}
              className={classes.button}
              onClick={() => handleProviderClick(provider)}
              title={provider.description || undefined}
            >
              <div className={classes.buttonWrapper}>
                {provider.icon ? (
                  <img src={provider.icon} className={classes.authLogo} alt="" />
                ) : provider.type === 'wso2' ? (
                  <img src={WSOLogo} className={classes.authLogo} alt="" />
                ) : (
                  <>
                    <KeyIcon className={classes.icon}></KeyIcon>
                    {title}
                  </>
                )}
              </div>
              <ChevronRightIcon></ChevronRightIcon>
            </Button>
          );
        })}
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

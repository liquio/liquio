import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

import PKCS7Form from 'components/PKCS7Form';

const styles = (theme) => ({
  title: {
    marginBottom: 24,
    ['@media (max-width:767px)']: {
      fontSize: 20,
      lineHeight: '30px',
    },
  },
  back: {
    marginBottom: '17.5px',
    backgroundColor: 'transparent',
    padding: 0,
    color: theme?.keyLogin?.color || '#0068FF',
    fontWeight: 400,
    letterSpacing: '0.25px',
    lineHeight: '21px',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  icon: {
    marginRight: 8,
  },
});

const OwnKeyLoginLayout = ({ t, classes, setId, onSelectKey, getDataToSign, onSignHash, auth, setLoginByOwnKey }) => (
  <>
    <Button className={classes.back} onClick={() => setLoginByOwnKey(false)}>
      <ChevronLeftIcon className={classes.icon} /> {t('back')}
    </Button>
    <Typography gutterBottom={true} id={setId('title')} variant="h4" className={classes.title}>
      {t('TITLE')}
    </Typography>
    <PKCS7Form
      auth={auth}
      onSelectKey={onSelectKey}
      onSignHash={onSignHash}
      getDataToSign={getDataToSign}
      setId={(elementName) => setId(`sign-form-pkcs7-${elementName}`)}
    />
  </>
);

OwnKeyLoginLayout.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.func.isRequired,
  setId: PropTypes.func,
  onSelectKey: PropTypes.func,
  setLoginByOwnKey: PropTypes.func,
};

OwnKeyLoginLayout.defaultProps = {
  setId: () => null,
  onSelectKey: () => null,
  setLoginByOwnKey: () => null,
};

const styled = withStyles(styles)(OwnKeyLoginLayout);
export default translate('LoginPage')(styled);

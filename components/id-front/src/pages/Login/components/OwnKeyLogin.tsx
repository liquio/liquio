import React from 'react';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import { Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { WithStyles } from '@mui/styles/withStyles';
import type { Theme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

import PKCS7Form from 'components/PKCS7Form';
import type { LoginStepProps } from './types';

const styles = (theme: Theme & { keyLogin?: { color?: string } }) => ({
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

interface OwnKeyLoginProps extends WithStyles<typeof styles>, LoginStepProps {
  t: Translate;
  setLoginByOwnKey?: (value: boolean) => void;
}

// `setId`, `onSelectKey` and `setLoginByOwnKey` default as the old `defaultProps` did.
const OwnKeyLoginLayout = ({
  t,
  classes,
  setId = () => null,
  onSelectKey = () => null,
  getDataToSign,
  onSignHash,
  auth,
  setLoginByOwnKey = () => null,
}: OwnKeyLoginProps) => (
  <>
    <Button className={classes.back} onClick={() => setLoginByOwnKey(false)}>
      <ChevronLeftIcon className={classes.icon} /> {t('back')}
    </Button>
    <Typography gutterBottom={true} id={setId('title') ?? undefined} variant="h4" className={classes.title}>
      {t('TITLE')}
    </Typography>
    <PKCS7Form
      auth={auth}
      onSelectKey={onSelectKey}
      onSignHash={onSignHash}
      getDataToSign={getDataToSign}
      setId={(elementName) => setId(`sign-form-pkcs7-${elementName}`) as string}
    />
  </>
);

const styled = withStyles(styles)(OwnKeyLoginLayout);
export default translate('LoginPage')(styled);

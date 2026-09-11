import React, { useCallback } from 'react';
import { Button, TextField } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { translate } from 'react-translate';

import edsService from 'services/eds';

const useStyles = makeStyles((theme) => ({
  content: {
    padding: 16,
    '& > *': {
      marginBottom: theme.spacing(2),
    },
  },
}));

const VerifyHash = ({ t }) => {
  const [hash, setHash] = React.useState('');
  const [sign, setSign] = React.useState('');
  const [error, setError] = React.useState(null);
  const [result, setResult] = React.useState('');

  const classes = useStyles();

  const handleClick = useCallback(async () => {
    try {
      setError(null);
      const signer = edsService.getSigner();
      const verifyResult = await signer.execute('VerifyHash', hash, sign);
      setResult(verifyResult);
    } catch (e) {
      setError(e.message);
      setResult('');
    }
  }, [hash, sign]);

  return (
    <div className={classes.content}>
      <TextField
        variant="outlined"
        multiline={true}
        rows={10}
        label={t('Hash')}
        value={hash}
        onChange={({ target: { value } }) => setHash(value)}
      />
      <TextField
        variant="outlined"
        multiline={true}
        rows={10}
        label={t('Sign')}
        value={sign}
        onChange={({ target: { value } }) => setSign(value)}
      />
      <Button variant="contained" color="primary" onClick={handleClick}>
        {t('Check')}
      </Button>
      <TextField
        variant="outlined"
        multiline={true}
        rows={10}
        label={t('Result')}
        value={result || error || ''}
      />
    </div>
  );
};

export default translate('DebugTools')(VerifyHash);

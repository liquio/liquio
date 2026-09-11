import React, { useCallback } from 'react';
import { Button, TextField } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import { translate } from 'react-translate';

import edsService from 'services/eds';
import Signer from 'services/eds/signer';

const useStyles = makeStyles((theme: Theme) => ({
  content: {
    padding: 16,
    '& > *': {
      marginBottom: theme.spacing(2),
    },
  },
}));

interface VerifyHashProps {
  t: (key: string) => string;
}

const VerifyHash = ({ t }: VerifyHashProps) => {
  const [hash, setHash] = React.useState('');
  const [sign, setSign] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<unknown>('');

  const classes = useStyles();

  const handleClick = useCallback(async () => {
    try {
      setError(null);
      const signer = edsService.getSigner() as Signer;
      const verifyResult = await signer.execute('VerifyHash', hash, sign);
      setResult(verifyResult);
    } catch (e) {
      setError((e as Error).message);
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
        onChange={({ target: { value } }: { target: { value: string } }) => setHash(value)}
      />
      <TextField
        variant="outlined"
        multiline={true}
        rows={10}
        label={t('Sign')}
        value={sign}
        onChange={({ target: { value } }: { target: { value: string } }) => setSign(value)}
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

export default translate('DebugTools')(VerifyHash as never) as unknown as React.ComponentType<Record<string, unknown>>;

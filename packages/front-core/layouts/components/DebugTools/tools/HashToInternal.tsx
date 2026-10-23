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

interface HashToInternalProps {
  t: (key: string) => string;
}

const HashToInternal = ({ t }: HashToInternalProps) => {
  const [signedHash, setSignedHash] = React.useState('');
  const [data, setData] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<unknown>('');

  const classes = useStyles();

  const handleClick = useCallback(async () => {
    try {
      setError(null);
      const signer = edsService.getSigner() as Signer;
      const internalSignature = await signer.execute(
        'HashToInternal',
        signedHash,
        data,
      );
      setResult(internalSignature);
    } catch (e) {
      setError((e as Error).message);
      setResult('');
    }
  }, [data, signedHash]);

  return (
    <div className={classes.content}>
      <TextField
        variant="outlined"
        multiline={true}
        rows={10}
        label={t('Hash')}
        value={signedHash}
        onChange={({ target: { value } }: { target: { value: string } }) => setSignedHash(value)}
      />
      <TextField
        variant="outlined"
        multiline={true}
        rows={10}
        label={t('Data')}
        value={data}
        onChange={({ target: { value } }: { target: { value: string } }) => setData(value)}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleClick}
        disabled={!signedHash || !data}
      >
        Перебрати
      </Button>
      <TextField
        variant="outlined"
        multiline={true}
        rows={10}
        label={t('Result')}
        value={result || error}
      />
    </div>
  );
};

export default translate('DebugTools')(HashToInternal as never) as unknown as React.ComponentType<Record<string, unknown>>;

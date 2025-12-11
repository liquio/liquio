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

const HashToInternal = ({ t }) => {
  const [signedHash, setSignedHash] = React.useState('');
  const [data, setData] = React.useState('');
  const [error, setError] = React.useState(null);
  const [result, setResult] = React.useState('');

  const classes = useStyles();

  const handleClick = useCallback(async () => {
    try {
      setError(null);
      const signer = edsService.getSigner();
      const internalSignature = await signer.execute(
        'HashToInternal',
        signedHash,
        data,
      );
      setResult(internalSignature);
    } catch (e) {
      setError(e.message);
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
        onChange={({ target: { value } }) => setSignedHash(value)}
      />
      <TextField
        variant="outlined"
        multiline={true}
        rows={10}
        label={t('Data')}
        value={data}
        onChange={({ target: { value } }) => setData(value)}
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

export default translate('DebugTools')(HashToInternal);

import React from 'react';
import { translate } from 'react-translate';
import { TextField, Button, Grid } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import edsService from 'services/eds';
import useStickyState from 'helpers/useStickyState';

function keyToUint8Array(input) {
  const keyLength = Object.values(input).length;
  const key = new Uint8Array(keyLength);
  for (let i = 0; i < keyLength; i++) {
    key[i] = input[i];
  }
  return key;
}

const styles = () => ({
  textField: {
    margin: 16,
  },
});

const EDSSignVerify = ({ classes, t }) => {
  const [sign, setSign] = useStickyState('', 'EDSSignVerify-sign');
  const [data, setData] = React.useState('');
  const [error, setError] = React.useState(null);
  const [signInfo, setSignInfo] = React.useState('');

  const getSignData = async () => {
    try {
      setError(null);
      const signer = edsService.getSigner();

      const {
        ownerInfo,
        data: singData,
        timeInfo,
      } = await signer.execute('VerifyDataInternal', sign);

      setData(new TextDecoder('utf-8').decode(keyToUint8Array(singData)));

      setSignInfo(JSON.stringify({ ownerInfo, timeInfo }, null, 4));
    } catch (e) {
      setError(e);
      setSignInfo('');
    }
  };

  return (
    <div className={classes.content}>
      <Grid container>
        <Grid item xs={6}>
          <TextField
            variant="outlined"
            multiline={true}
            rows={21}
            label={t('SignData')}
            value={sign}
            onChange={({ target: { value } }) => setSign(value)}
            className={classes.textField}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={getSignData}
            className={classes.textField}
          >
            {t('Decode')}
          </Button>
        </Grid>
        <Grid item xs={6}>
          <TextField
            variant="outlined"
            multiline={true}
            error={!!error}
            rows={10}
            label={t('DecodedData')}
            value={(error && error.message) || data}
            className={classes.textField}
          />
          <TextField
            variant="outlined"
            multiline={true}
            error={!!error}
            rows={10}
            label={t('Signer')}
            value={signInfo}
            className={classes.textField}
          />
        </Grid>
      </Grid>
    </div>
  );
};

const styled = withStyles(styles)(EDSSignVerify);

export default translate('DebugTools')(styled);

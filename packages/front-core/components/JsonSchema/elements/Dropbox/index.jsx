import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { Button, CircularProgress, Typography } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { createSignSession, updateSignSession } from 'actions/dropbox';
import HelloSign from 'hellosign-embedded';
import objectPath from 'object-path';
import { getConfig } from 'helpers/configLoader';

const useStyles = makeStyles(() => ({
  fillIcon: {
    color: '#fff'
  },
  mb20: {
    marginBottom: 20
  }
}));

const INTERVAL = 3000;

const Dropbox = (props) => {
  const config = getConfig();
  const t = useTranslate('Dropbox');
  const dispatch = useDispatch();
  const classes = useStyles();
  const [loading, setLoading] = React.useState(false);
  const [shown, setShown] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [serviceError, setError] = React.useState(false);

  const interval = React.useRef(null);

  const {
    required,
    error,
    width,
    noMargin,
    value,
    hidden,
    task,
    signerControlPath,
    signerFilesPath,
    actionText,
    stepName,
    path,
    testMode
  } = props;

  const handleOpenClient = React.useCallback(
    (result) => {
      setShown(true);

      const clientId = config?.external_file_signer?.dropboxSign?.clientId;

      const client = new HelloSign({ clientId });

      result?.calculated?.extraData?.signatures.forEach(() => {
        client.open(result?.calculated?.signingUrl, { testMode });
      });
    },
    [value, testMode]
  );

  const handleUpdateSession = React.useCallback(async () => {
    setLoading(true);

    clearInterval(interval.current);

    interval.current = setInterval(async () => {
      const result = await dispatch(updateSignSession(task.documentId, { signerControlPath }));

      if (result instanceof Error) {
        setError(result);
      }

      const controlData = objectPath.get(result.data, [stepName].concat(path));

      if (['completed'].includes(controlData?.calculated?.status)) {
        setLoading(false);
        setSuccess(true);
        clearInterval(interval.current);
        return;
      }
    }, INTERVAL);
  }, [dispatch, stepName, path, task.documentId, signerControlPath]);

  const init = React.useCallback(async (force) => {
    if (loading && !force) return;

    setLoading(true);

    setError(false);

    const result = await dispatch(
      createSignSession(task.documentId, {
        signerControlPath,
        signerFilesPath,
        force: true
      })
    );

    const controlData = objectPath.get(result.data, [stepName].concat(path));

    if (!shown) {
      handleOpenClient(controlData);
    }

    setLoading(false);

    handleUpdateSession();
  }, [
    dispatch,
    loading,
    value,
    signerControlPath,
    signerFilesPath,
    handleUpdateSession,
    handleOpenClient,
    shown,
    task.documentId
  ]);

  React.useEffect(() => {
    if (value?.calculated) {
      handleUpdateSession();
    }
    return () => {
      clearInterval(interval.current);
    };  
  }, [handleUpdateSession, value?.calculated]);

  if (hidden) return null;

  return (
    <ElementContainer required={required} error={error} width={width} noMargin={noMargin}>
      {success ? (
        <Typography>{t('Success')}</Typography>
      ) : null}

      {serviceError ? (
        <Typography className={classes.mb20}>{serviceError?.message}</Typography>
      ) : null} 

      <Button
        variant="contained"
        color="primary"
        onClick={() => init(serviceError)}
        startIcon={loading && !serviceError ? <CircularProgress className={classes.fillIcon} size={16} /> : null}
      >
        {serviceError ? t('Retry') : (
          actionText || t('StartDropbox')
        )}
      </Button>
    </ElementContainer>
  );
};

export default Dropbox;

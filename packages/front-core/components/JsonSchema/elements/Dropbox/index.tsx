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

interface DropboxProps {
  required?: boolean;
  error?: unknown;
  width?: number | string;
  noMargin?: boolean;
  value?: { calculated?: unknown } | null;
  hidden?: boolean;
  task: { documentId: string | number };
  signerControlPath?: string;
  signerFilesPath?: string;
  actionText?: string;
  stepName: string;
  path: Array<string | number>;
  testMode?: boolean;
}

const Dropbox = (props: DropboxProps) => {
  const config = getConfig() as unknown as { external_file_signer?: { dropboxSign?: { clientId?: string } } };
  const t = useTranslate('Dropbox');
  const dispatch = useDispatch();
  const classes = useStyles();
  const [loading, setLoading] = React.useState(false);
  const [shown, setShown] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [serviceError, setError] = React.useState<Error | false>(false);

  const interval = React.useRef<ReturnType<typeof setInterval> | null>(null);

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
    (result: { calculated?: { extraData?: { signatures?: unknown[] }; signingUrl?: string } }) => {
      setShown(true);

      const clientId = config?.external_file_signer?.dropboxSign?.clientId;

      const client = new HelloSign({ clientId });

      result?.calculated?.extraData?.signatures?.forEach(() => {
        client.open(result?.calculated?.signingUrl as string, { testMode });
      });
    },
    [value, testMode]
  );

  const handleUpdateSession = React.useCallback(async () => {
    setLoading(true);

    clearInterval(interval.current as ReturnType<typeof setInterval>);

    interval.current = setInterval(async () => {
      const result = (await dispatch(updateSignSession(task.documentId, { signerControlPath }) as never)) as { data: unknown } | Error;

      if (result instanceof Error) {
        setError(result);
      }

      const controlData = objectPath.get((result as { data: unknown }).data, ([stepName] as Array<string | number>).concat(path)) as { calculated?: { status?: string } } | undefined;

      if (['completed'].includes(controlData?.calculated?.status as string)) {
        setLoading(false);
        setSuccess(true);
        clearInterval(interval.current as ReturnType<typeof setInterval>);
        return;
      }
    }, INTERVAL);
  }, [dispatch, stepName, path, task.documentId, signerControlPath]);

  const init = React.useCallback(async (force?: boolean | Error) => {
    if (loading && !force) return;

    setLoading(true);

    setError(false);

    const result = (await dispatch(
      createSignSession(task.documentId, {
        signerControlPath,
        signerFilesPath,
        force: true
      }) as never,
    )) as { data: unknown };

    const controlData = objectPath.get(result.data, ([stepName] as Array<string | number>).concat(path));

    if (!shown) {
      handleOpenClient(controlData as { calculated?: { extraData?: { signatures?: unknown[] }; signingUrl?: string } });
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
      clearInterval(interval.current as ReturnType<typeof setInterval>);
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

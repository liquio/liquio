import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ConfirmDialog from 'components/ConfirmDialog';
import { stopDelayEvent } from 'application/actions/workflowProcess';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import BlockIcon from '@mui/icons-material/Block';

const styles = {
  ids: {
    paddingLeft: 5,
  },
  link: {
    textDecorationColor: '#fff',
  },
};

const StopDelayEvent = ({ processId, classes, details, delayId }) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const t = useTranslate('ProcessesListPage');

  const handleStop = async () => {
    if (loading) return;

    setLoading(true);

    const result = await stopDelayEvent(processId, details?.id)(dispatch);

    if (result instanceof Error) {
      dispatch(
        addMessage(
          new Message(result?.message || 'StopEventDelayError', 'error'),
        ),
      );
      setLoading(false);
      setOpen(false);
    } else {
      window.location.reload();
    }
  };

  if (!delayId.includes(details?.eventTypeId)) return null;

  if (details?.done) return null;

  return (
    <>
      <Tooltip title={t('StopEventTooltip')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          {loading ? (
            <CircularProgress size={24} className={classes.icon} />
          ) : (
            <BlockIcon className={classes.icon} />
          )}
        </IconButton>
      </Tooltip>

      <ConfirmDialog
        open={open}
        loading={loading}
        darkTheme={true}
        handleClose={() => setOpen(false)}
        handleConfirm={() => handleStop()}
        title={t('StopEvent')}
        description={t('StopEventDescription', {
          event: `${details?.name} ${details?.eventTemplateId}`,
        })}
        cancelButtonText={t('Cancel')}
        acceptButtonText={t('Yes')}
      />
    </>
  );
};

export default withStyles(styles)(StopDelayEvent);

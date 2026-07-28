import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ConfirmDialog from 'components/ConfirmDialog';
import { skipDelayEvent } from 'application/actions/workflowProcess';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import SkipNextIcon from '@mui/icons-material/SkipNext';

const styles = {
  ids: {
    paddingLeft: 5,
  },
  link: {
    textDecorationColor: '#fff',
  },
};

const StopDelayEvent = ({ classes, details, delayId }) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const t = useTranslate('ProcessesListPage');

  const handleSkip = async () => {
    if (loading) return;

    setLoading(true);

    const result = await skipDelayEvent(details?.id)(dispatch);

    if (result instanceof Error) {
      dispatch(
        addMessage(
          new Message(t(result?.message) || 'StopEventDelayError', 'error'),
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
      <Tooltip title={t('SkipEventTooltip')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          {loading ? (
            <CircularProgress size={24} className={classes.icon} />
          ) : (
            <SkipNextIcon className={classes.icon} />
          )}
        </IconButton>
      </Tooltip>

      <ConfirmDialog
        open={open}
        loading={loading}
        darkTheme={true}
        handleClose={() => setOpen(false)}
        handleConfirm={() => handleSkip()}
        title={t('StopEvent')}
        description={t('SkipEventDescription', {
          event: `${details?.name} ${details?.eventTemplateId}`,
        })}
        cancelButtonText={t('Cancel')}
        acceptButtonText={t('Yes')}
      />
    </>
  );
};

export default withStyles(styles)(StopDelayEvent);

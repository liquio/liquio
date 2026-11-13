import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import { skipDelayEvent } from 'application/actions/workflowProcess';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import SkipNextIcon from '@mui/icons-material/SkipNext';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  ids: {
    paddingLeft: 5,
  },
  link: {
    textDecorationColor: '#fff',
  },
};

interface SkipDelayEventDetails {
  id?: string | number;
  eventTypeId?: string | number;
  done?: boolean;
  name?: string;
  eventTemplateId?: string | number;
}

interface SkipDelayEventProps {
  classes: Record<string, string>;
  details: SkipDelayEventDetails;
  delayId: Array<string | number>;
}

// Internal name preserved from the original file (a copy of StopDelayEvent.jsx
// whose renamed export wasn't fully renamed internally) — a cosmetic-only
// mismatch, since this local `const` is never referenced by name elsewhere.
const StopDelayEvent = ({ classes, details, delayId }: SkipDelayEventProps) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const t = useTranslate('ProcessesListPage');

  const handleSkip = async () => {
    if (loading) return;

    setLoading(true);

    const result = (await skipDelayEvent(details?.id as string | number)(dispatch as never)) as { message?: string } | Error;

    if (result instanceof Error) {
      dispatch(
        addMessage(
          new Message(t((result as { message?: string })?.message as string) || 'StopEventDelayError', 'error'),
        ) as never,
      );
      setLoading(false);
      setOpen(false);
    } else {
      window.location.reload();
    }
  };

  if (!delayId.includes(details?.eventTypeId as string | number)) return null;

  if (details?.done) return null;

  return (
    <>
      <Tooltip title={t('SkipEventTooltip')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          {loading ? (
            <CircularProgress size={24} className={(classes as { icon?: string }).icon} />
          ) : (
            <SkipNextIcon className={(classes as { icon?: string }).icon} />
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

export default withStyles(styles)(StopDelayEvent as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

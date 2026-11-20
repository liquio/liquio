import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import { stopDelayEvent } from 'application/actions/workflowProcess';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import BlockIcon from '@mui/icons-material/Block';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  ids: {
    paddingLeft: 5,
  },
  link: {
    textDecorationColor: '#fff',
  },
};

interface StopDelayEventDetails {
  id?: string | number;
  eventTypeId?: string | number;
  done?: boolean;
  name?: string;
  eventTemplateId?: string | number;
}

interface StopDelayEventProps {
  processId: string | number;
  classes: Record<string, string>;
  details: StopDelayEventDetails;
  delayId: Array<string | number>;
}

const StopDelayEvent = ({ processId, classes, details, delayId }: StopDelayEventProps) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const t = useTranslate('ProcessesListPage');

  const handleStop = async () => {
    if (loading) return;

    setLoading(true);

    const result = (await stopDelayEvent(processId, details?.id as string | number)(dispatch as never)) as { message?: string } | Error;

    if (result instanceof Error) {
      dispatch(
        addMessage(
          new Message((result as { message?: string })?.message || 'StopEventDelayError', 'error'),
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
      <Tooltip title={t('StopEventTooltip')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          {loading ? (
            <CircularProgress size={24} className={(classes as { icon?: string }).icon} />
          ) : (
            <BlockIcon className={(classes as { icon?: string }).icon} />
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

export default withStyles(styles)(StopDelayEvent as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

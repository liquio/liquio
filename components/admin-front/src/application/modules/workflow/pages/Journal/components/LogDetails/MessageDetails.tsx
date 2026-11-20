import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import { IconButton, Tooltip } from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import { restartProcessFromPoint } from 'application/actions/workflowProcess';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface MessagesDetailsProps {
  processId: string | number;
  log: { details: { data: unknown } };
}

const MessagesDetails = ({
  processId,
  log: {
    details: { data },
  },
}: MessagesDetailsProps) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const t = useTranslate('ProcessesListPage');

  const handleRestart = async () => {
    setLoading(true);

    const result = (await restartProcessFromPoint(processId, data)(dispatch as never)) as unknown;

    if (result instanceof Error) {
      dispatch(
        addMessage(
          new Message('FailRestartingWorkflowProcessFromPoint', 'error'),
        ) as never,
      );
      setLoading(false);
      setOpen(false);
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <Tooltip title={t('RestartProcessFromPoint')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <RepeatIcon />
        </IconButton>
      </Tooltip>

      <ConfirmDialog
        open={open}
        loading={loading}
        darkTheme={true}
        handleClose={() => setOpen(false)}
        handleConfirm={handleRestart}
        title={t('RestartProcessFromPoint')}
        description={t('RestartProcessConfirmation', {
          point: '',
        })}
        cancelButtonText={t('Cancel')}
        acceptButtonText={t('RestartProcess')}
      />
    </>
  );
};

export default MessagesDetails;

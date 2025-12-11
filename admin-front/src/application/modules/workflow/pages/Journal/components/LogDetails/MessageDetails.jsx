import React from 'react';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import { IconButton, Tooltip } from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';
import ConfirmDialog from 'components/ConfirmDialog';
import { restartProcessFromPoint } from 'application/actions/workflowProcess';

const MessagesDetails = ({
  processId,
  log: {
    details: { data },
  },
}) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const t = useTranslate('ProcessesListPage');

  const handleRestart = async () => {
    setLoading(true);

    const result = await restartProcessFromPoint(processId, data)(dispatch);

    if (result instanceof Error) {
      dispatch(
        addMessage(
          new Message('FailRestartingWorkflowProcessFromPoint', 'error'),
        ),
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

MessagesDetails.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  processId: PropTypes.string.isRequired,
  log: PropTypes.object.isRequired,
};

export default MessagesDetails;

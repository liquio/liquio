import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { generateUUID } from 'utils/uuid';
import { Typography, IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import RepeatIcon from '@mui/icons-material/Repeat';
import ConfirmDialog from 'components/ConfirmDialog';
import HighlightText from 'components/HighlightText';
import { restartProcessFromPoint } from 'application/actions/workflowProcess';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

const styles = {
  ids: {
    paddingLeft: 5,
  },
  link: {
    textDecorationColor: '#fff',
  },
};

const ElementDetails = ({
  classes,
  search,
  processId,
  log: { type, details },
  checked,
}) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const t = useTranslate('ProcessesListPage');

  const elementId = details[type + 'TemplateId'];
  const workflowId = String(elementId).slice(0, -3);

  const restartable = ['task'].includes(type) && details?.finished;

  const handleRestart = async () => {
    setLoading(true);

    const result = await restartProcessFromPoint(processId, {
      taskId: details?.id,
      workflowId: details?.workflowId,
      amqpMessageId: generateUUID(),
    })(dispatch);

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
      <a
        rel="noopener noreferrer"
        target="_blank"
        href={`/workflow/${workflowId}/${type}-${elementId}`}
        className={classes.link}
      >
        <Typography variant="body2" className={classes.ids}>
          <HighlightText
            highlight={search}
            text={elementId + ' ' + (details.name || '')}
          />
        </Typography>
      </a>

      {restartable && checked ? (
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
              point: `: ${type}-${elementId}`,
            })}
            cancelButtonText={t('Cancel')}
            acceptButtonText={t('RestartProcess')}
          />
        </>
      ) : null}
    </>
  );
};

export default withStyles(styles)(ElementDetails);

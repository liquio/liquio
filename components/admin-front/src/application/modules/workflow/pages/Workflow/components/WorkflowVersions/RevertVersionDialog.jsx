import React from 'react';
import { useTranslate } from 'react-translate';

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';

import { makeStyles } from '@mui/styles';

import useVersion from 'modules/workflow/pages/Workflow/components/WorkflowVersions/hooks/useVersion';
import useRevert from 'modules/workflow/pages/Workflow/components/WorkflowVersions/hooks/useRevert';

import RevertChangesTable from 'modules/workflow/pages/Workflow/components/WorkflowVersions/RevertChangesTable';

const useStyles = makeStyles({
  flexGrow: {
    flexGrow: 1,
  },
});

const RevertVersionDialog = ({
  open,
  onClose,
  revert,
  onRevert,
  current,
  workflowId,
}) => {
  const t = useTranslate('WorkflowAdminPage');
  const classes = useStyles();

  const { data: revertData } = useVersion(revert, workflowId);
  const { data: currentData } = useVersion(current, workflowId);

  const {
    busy,
    error,
    start,
    changes,
    progress,
    progressText,
    onSelectChanges,
  } = useRevert(currentData, revertData, { t, workflowId, onRevert });

  const hasChanges = React.useMemo(
    () => !!(changes && changes.filter(({ disabled }) => !disabled).length > 0),
    [changes],
  );

  return (
    <Dialog
      open={open}
      scroll="body"
      maxWidth="md"
      fullWidth={true}
      onClose={busy ? undefined : onClose}
    >
      <DialogTitle>{t('RevertToVersion', { version: revert })}</DialogTitle>
      {busy ? (
        <DialogContent>
          {progressText ? (
            <Typography className={classes.progressText}>
              {progress ? (
                <CircularProgress size={12} className={classes.progress} />
              ) : null}
              {progressText}
            </Typography>
          ) : null}
          <LinearProgress
            value={progress}
            variant={progress ? 'determinate' : 'indeterminate'}
          />
        </DialogContent>
      ) : (
        <RevertChangesTable
          disabled={busy}
          changes={changes}
          onSelect={onSelectChanges}
        />
      )}
      <DialogActions>
        {error ? <Typography>{error.message}</Typography> : null}
        <div className={classes.flexGrow} />
        <Button onClick={onClose} disabled={busy}>
          {t('Cancel')}
        </Button>
        <Button
          disabled={busy || !hasChanges}
          onClick={start}
          color="primary"
          variant="contained"
        >
          {t('Revert')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RevertVersionDialog;

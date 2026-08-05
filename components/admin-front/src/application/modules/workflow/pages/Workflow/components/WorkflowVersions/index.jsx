import React from 'react';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import WorkflowVersionsDialog from 'modules/workflow/pages/Workflow/components/WorkflowVersions/WorkflowVersionsDialog';
import HistoryIcon from '@mui/icons-material/History';

const WorkflowVersions = ({
  workflowId,
  lastWorkflowHistoryId,
  lastWorkflowHistoryVersion,
  initWorkflow,
}) => {
  const t = useTranslate('WorkflowAdminPage');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('Versions')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <HistoryIcon />
        </IconButton>
      </Tooltip>

      {open ? (
        <WorkflowVersionsDialog
          open={open}
          setOpen={setOpen}
          workflowId={workflowId}
          initWorkflow={initWorkflow}
          lastWorkflowHistoryId={lastWorkflowHistoryId}
          lastWorkflowHistoryVersion={lastWorkflowHistoryVersion}
        />
      ) : null}
    </>
  );
};

export default WorkflowVersions;

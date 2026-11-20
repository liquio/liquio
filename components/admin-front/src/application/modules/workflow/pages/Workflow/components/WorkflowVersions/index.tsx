import React from 'react';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import WorkflowVersionsDialogRaw from 'modules/workflow/pages/Workflow/components/WorkflowVersions/WorkflowVersionsDialog';
import HistoryIcon from '@mui/icons-material/History';

const WorkflowVersionsDialog = WorkflowVersionsDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface WorkflowVersionsProps {
  workflowId?: string | number;
  lastWorkflowHistoryId?: string | number;
  lastWorkflowHistoryVersion?: string;
  initWorkflow: (arg?: null, flag?: boolean) => Promise<{ lastWorkflowHistory?: { id?: string | number } }>;
}

const WorkflowVersions = ({
  workflowId,
  lastWorkflowHistoryId,
  lastWorkflowHistoryVersion,
  initWorkflow,
}: WorkflowVersionsProps) => {
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

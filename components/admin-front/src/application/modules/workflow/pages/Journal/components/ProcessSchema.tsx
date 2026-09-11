import React from 'react';
import { translate } from 'react-translate';
import { IconButton } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import AccountTreeIcon from '@mui/icons-material/AccountTree';

import { BPMNViewer } from 'components/BpmnSchema';
import FullScreenDialogRaw from 'components/FullScreenDialog';

const FullScreenDialog = FullScreenDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  button: {
    marginRight: 4,
  },
};

interface WorkflowProcess {
  workflowTemplate: { name?: string; xmlBpmnSchema?: string };
}

interface ProcessSchemaProps {
  classes: Record<string, string>;
  process?: WorkflowProcess;
  data?: unknown;
}

const ProcessSchema = ({ classes, process, data }: ProcessSchemaProps) => {
  const [open, setOpen] = React.useState(false);

  if (!process) {
    return null;
  }

  const {
    workflowTemplate: { name, xmlBpmnSchema },
  } = process;

  return (
    <>
      <IconButton
        {...({ variant: 'outlined' } as unknown as Record<string, unknown>)}
        className={classes.button}
        onClick={() => setOpen(true)}
        size="large"
      >
        <AccountTreeIcon />
      </IconButton>
      <FullScreenDialog open={open} title={name} onClose={() => setOpen(false)}>
        <BPMNViewer schema={xmlBpmnSchema as never} data={data as never} />
      </FullScreenDialog>
    </>
  );
};

const styled = withStyles(styles)(ProcessSchema as never);
export default translate('ProcessesListPage')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

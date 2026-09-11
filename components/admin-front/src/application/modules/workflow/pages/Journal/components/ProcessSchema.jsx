import React from 'react';
import { translate } from 'react-translate';
import { IconButton } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import AccountTreeIcon from '@mui/icons-material/AccountTree';

import { BPMNViewer } from 'components/BpmnSchema';
import FullScreenDialog from 'components/FullScreenDialog';

const styles = {
  button: {
    marginRight: 4,
  },
};

const ProcessSchema = ({ classes, process, data }) => {
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
        variant="outlined"
        className={classes.button}
        onClick={() => setOpen(true)}
        size="large"
      >
        <AccountTreeIcon />
      </IconButton>
      <FullScreenDialog open={open} title={name} onClose={() => setOpen(false)}>
        <BPMNViewer schema={xmlBpmnSchema} data={data} />
      </FullScreenDialog>
    </>
  );
};

const styled = withStyles(styles)(ProcessSchema);
export default translate('ProcessesListPage')(styled);

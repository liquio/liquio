import React from 'react';
import { translate } from 'react-translate';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
// import Scrollbar from 'components/Scrollbar';
import CodeEditDialogRaw from 'components/CodeEditDialog';

import { Tooltip, IconButton } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

const styles = {
  root: {
    height: 200,
    width: 600,
    backgroundColor: '#141414',
    color: '#F8F8F8',
    cursor: 'pointer',
  },
};

interface JsonExpandProps {
  t: (key: string) => string;
  value?: unknown;
}

const JsonExpand = ({ t, value = {} }: JsonExpandProps) => {
  // Read at call time rather than module scope: `components/CodeEditDialog`
  // is part of the Editor/UserSettings/JsonSchema/CodeEditDialog circular
  // import chain documented in TYPESCRIPT.md — a module-top-level read can
  // run while that module is still mid-evaluation.
  const CodeEditDialog = CodeEditDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const [open, setOpen] = React.useState(false);
  const stringValue = JSON.stringify(value, null, 4);

  return (
    <>
      <Tooltip title={t('WorkflowLogDetails')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <RemoveRedEyeIcon />
        </IconButton>
      </Tooltip>
      {/* <div className={classes.root} onClick={() => setOpen(true)}>
            <Scrollbar><pre>{stringValue}</pre></Scrollbar>
        </div> */}
      <CodeEditDialog
        open={open}
        onClose={() => setOpen(false)}
        value={stringValue || ''}
        readOnly={true}
      />
    </>
  );
};

const translated = translate('ProcessesListPage')(JsonExpand as never);
export default withStyles(styles)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

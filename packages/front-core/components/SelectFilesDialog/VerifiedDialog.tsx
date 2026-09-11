import React from 'react';
import { Button, Dialog, DialogActions, DialogTitle } from '@mui/material';

import cx from 'classnames';

interface VerifiedDialogProps {
  openVerifiedDialog: boolean;
  toggleVerifiedDialog: () => void;
  setId: (elementName: string) => string;
  classes: Record<string, string>;
  t: (key: string, params?: Record<string, unknown>) => string;
  name: string;
  uploadFile: () => void;
}

const VerifiedDialog = ({
  openVerifiedDialog,
  toggleVerifiedDialog,
  setId,
  classes,
  t,
  name,
  uploadFile,
}: VerifiedDialogProps) => (
  <Dialog
    fullWidth={true}
    open={openVerifiedDialog}
    onClose={toggleVerifiedDialog}
    id={setId('verified-dialog')}
    className={classes.dialog}
  >
    <DialogTitle
      id={setId('title responsive-dialog-title')}
      className={classes.dialogContentWrappers}
    >
      {t('VERIFIED', { name })}
    </DialogTitle>
    <DialogActions
      className={cx(classes.actions, classes.dialogContentWrappers)}
      id={setId('actions')}
    >
      <Button
        onClick={uploadFile}
        {...({ color: 'yellow' } as unknown as Record<string, unknown>)}
        id={setId('save-button')}
        {...({ setId: (elementName: string) => setId(`verify-${elementName}`) } as unknown as Record<string, unknown>)}
      >
        {t('VERIFY')}
      </Button>
    </DialogActions>
  </Dialog>
);

export default VerifiedDialog;

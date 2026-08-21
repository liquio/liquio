import React from 'react';
import PropTypes from 'prop-types';
import { Button, Dialog, DialogActions, DialogTitle } from '@mui/material';

import cx from 'classnames';

const VerifiedDialog = ({
  openVerifiedDialog,
  toggleVerifiedDialog,
  setId,
  classes,
  t,
  name,
  uploadFile,
}) => (
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
        color="yellow"
        id={setId('save-button')}
        setId={(elementName) => setId(`verify-${elementName}`)}
      >
        {t('VERIFY')}
      </Button>
    </DialogActions>
  </Dialog>
);

VerifiedDialog.propTypes = {
  openVerifiedDialog: PropTypes.bool.isRequired,
  toggleVerifiedDialog: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  uploadFile: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  setId: PropTypes.func.isRequired,
};

export default VerifiedDialog;

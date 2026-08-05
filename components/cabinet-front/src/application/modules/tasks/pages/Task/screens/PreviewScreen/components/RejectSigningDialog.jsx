import React from 'react';
import { translate } from 'react-translate';
import { Dialog, DialogTitle, DialogContent, Button, DialogActions } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import Scrollbar from 'components/Scrollbar';
import StringElement from 'components/JsonSchema/elements/StringElement';

const styles = {
  title: {
    padding: '12px 24px 0'
  }
};

const RejectSigningDialog = ({ t, classes, open, onClose, handleDone }) => {
  const [rejectReason, setRejectReason] = React.useState('');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth={true}>
      <DialogTitle className={classes.title}>{t('RejectSigningDialogTitle')}</DialogTitle>
      <Scrollbar>
        <DialogContent>
          <StringElement
            description={t('RejectSignReason')}
            value={rejectReason}
            fullWidth={true}
            multiline={true}
            required={true}
            onChange={(value) => setRejectReason(value)}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!rejectReason}
            onClick={() => handleDone({ rejectReason })}
          >
            {t('RejectSign')}
          </Button>
        </DialogActions>
      </Scrollbar>
    </Dialog>
  );
};

const translated = translate('TaskPage')(RejectSigningDialog);
export default withStyles(styles)(translated);

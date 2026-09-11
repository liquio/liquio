import React from 'react';
import { translate } from 'react-translate';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import P7SForm from '.';

const styles = (theme) => ({
  title: {
    padding: '12px 60px 0px 24px',
    marginBottom: 20,
    [theme.breakpoints.down('md')]: {
      paddingTop: 20,
      paddingLeft: 16,
      paddingRight: 17
    },
    '& h2': {
      [theme.breakpoints.down('md')]: {
        fontSize: 17,
        marginBottom: 5
      }
    }
  },
  paperWidthSm: {
    [theme.breakpoints.down('md')]: {
      padding: 5,
      margin: '40px auto!important',
      width: '95%',
      maxWidth: 'unset',
      minWidth: 'unset',
      paddingTop: 35
    }
  },
  paper: {
    maxWidth: '620px'
  },
  paperScrollBody: {
    [theme.breakpoints.down('md')]: {
      maxWidth: 'calc(100% - 32px)!important',
      paddingLeft: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingTop: 0
    }
  },
  root: {
    [theme.breakpoints.down('md')]: {
      paddingLeft: 16,
      paddingRight: 16
    }
  }
});

const SigningDialog = ({
  t,
  classes,
  title,
  open,
  onClose,
  onSelectKey,
  signProgress,
  signProgressText,
  readPrivateKeyText,
  getDataToSign,
  onSignHash,
  task,
  template
}) => (
  <Dialog
    open={open}
    onClose={(event, reason) => {
      if (reason === 'backdropClick') {
        return false;
      }

      return onClose();
    }}
    fullWidth={true}
    scroll="body"
    classes={{
      paperWidthSm: classes.paperWidthSm,
      paperScrollBody: classes.paperScrollBody,
      paper: classes.paper
    }}
  >
    <DialogTitle className={classes.title}>{title || t('SigningDialogTitle')}</DialogTitle>
    <DialogContent
      classes={{
        root: classes.root
      }}
    >
      <P7SForm
        classes={classes}
        onSelectKey={onSelectKey}
        onClose={onClose}
        signProgress={signProgress}
        signProgressText={signProgressText}
        readPrivateKeyText={readPrivateKeyText}
        getDataToSign={getDataToSign}
        onSignHash={onSignHash}
        task={task}
        template={template}
      />
    </DialogContent>
  </Dialog>
);

const translated = translate('TaskPage')(SigningDialog);
export default withStyles(styles)(translated);

import React from 'react';
import { translate } from 'react-translate';
import { DialogTitle, DialogContent, DialogContentText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ErrorIcon from '@mui/icons-material/ErrorOutline';

const styles = {
  icon: {
    fontSize: 82,
    color: 'red',
  },
  title: {
    textAlign: 'center',
  },
};

const PageNotFoundScreen = ({ t, classes }) => (
  <>
    <DialogTitle className={classes.title}>
      <ErrorIcon className={classes.icon} />
    </DialogTitle>
    <DialogTitle className={classes.title}>{t('ErrorMessageHeader')}</DialogTitle>
    <DialogContent className={classes.title}>
      <DialogContentText>{t('PageNotFound')}</DialogContentText>
    </DialogContent>
  </>
);

const translated = translate('App')(PageNotFoundScreen);
export default withStyles(styles)(translated);

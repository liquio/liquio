import React from 'react';
import { translate } from 'react-translate';
import { DialogTitle, DialogContent, DialogContentText, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import renderHTML from 'helpers/renderHTML';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

const styles = (theme) => ({
  icon: {
    fontSize: 82,
    color: 'red'
  },
  title: {
    textAlign: 'center'
  },
  socialIcon: {
    width: 65,
    height: 65,
    marginRight: 15
  },
  name: {
    fontSize: 22,
    lineHeight: '28px',
    paddingTop: 15,
    paddingBottom: 20
  },
  wrapper: {
    padding: 80,
    lineHeight: '35px'
  },
  buttonWithSidebar: {
    marginRight: 20,
    [theme.breakpoints.down('md')]: {
      minWidth: 110,
      padding: '28px'
    }
  },
  button: {
    marginRight: 20,
    [theme.breakpoints.down('md')]: {
      padding: '10px'
    },
    [theme.breakpoints.down('sm')]: {
      minWidth: 105,
      padding: '28px'
    }
  },
  actionsWrapper: {
    display: 'flex',
    marginTop: 50
  }
});

const ErrorScreen = ({ t, classes, error, darkTheme }) => {
  const openSidebar = useSelector((state) => state.app.openSidebar);
  if (!error) return null;

  if (error.message === 'Error: Only one draft allowed.') {
    const toDraftsAction = () => {
      window.location.href = `${window.location.origin}/workflow/drafts`;
    };

    const continueEditingAction = () => {
      window.location.href = `${window.location.origin}/tasks/${error.details.task.id}`;
    };

    const errorText = error?.details?.message ? error?.details?.message : t('OneDraftAllowedText');

    return (
      <div className={classes.wrapper}>
        {renderHTML(errorText)}
        <div className={classes.actionsWrapper}>
          <Button
            size="large"
            variant="outlined"
            className={classNames({
              [classes.buttonWithSidebar]: openSidebar,
              [classes.button]: !openSidebar
            })}
            onClick={toDraftsAction}
            classes={{ disabled: classes.disabledBorder }}
          >
            {t('ToDrafts')}
          </Button>
          <Button size="large" color="primary" variant="contained" onClick={continueEditingAction}>
            {t('ContinueEditing')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DialogTitle className={classes.title}>
        <ErrorIcon className={classes.icon} />
      </DialogTitle>
      <DialogTitle className={classes.title}>{t('ErrorMessageHeader')}</DialogTitle>
      <DialogContent className={classes.title}>
        <DialogContentText
          classes={{
            root: classNames({
              [classes.text]: darkTheme
            })
          }}
        >
          {error.message}
        </DialogContentText>
      </DialogContent>
    </>
  );
};

const translated = translate('TaskPage')(ErrorScreen);
export default withStyles(styles)(translated);

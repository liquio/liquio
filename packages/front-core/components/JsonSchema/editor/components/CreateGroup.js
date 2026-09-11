import React from 'react';
import { makeStyles } from '@mui/styles';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import StringElement from 'components/JsonSchema/elements/StringElement';
import ProgressLine from 'components/Preloader/ProgressLine';

const withStyles = makeStyles((theme) => ({
  dialogTitle: {
    '& > h2': {
      marginTop: 20,
      fontWeight: 400,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
      marginBottom: 20,
      color: '#fff'
    }
  },
  paper: {
    backgroundColor: '#404040',
    borderRadius: 2,
    minWidth: 688,
    [theme.breakpoints.down('md')]: {
      minWidth: '100%'
    }
  },
  saveAction: {
    backgroundColor: '#BB86FC',
    color: '#000000',
    marginLeft: 15,
    '&:hover': {
      backgroundColor: '#BB86FC',
      color: '#000000'
    }
  },
  closeAction: {
    color: '#BB86FC'
  },
  dialogAction: {
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 25,
    paddingBottom: 40
  },
  icon: {
    marginRight: 10,
    fill: '#BB86FC'
  },
  progressLineWrapper: {
    marginTop: 20
  }
}));

const CreateGroup = (props) => {
  const {
    t,
    open,
    handleClose,
    handleCreateGroup,
    handleDeleteGroup,
    activeGroup,
    loading,
    readOnly,
    groups
  } = props;

  const classes = withStyles();
  const [groupName, setGroupName] = React.useState(() => {
    if (activeGroup) {
      return activeGroup.name;
    }
    return '';
  });
  const [error, setError] = React.useState(false);

  const handleSave = () => {
    if (!groupName) {
      setError(t('RequiredField'));
      return;
    }

    if (groups.find((group) => group.name === groupName)) {
      setError(t('GroupNameAlreadyExist'));
      return;
    }

    handleCreateGroup({
      name: groupName
    });
  };

  return (
    <Dialog
      open={open}
      scroll="body"
      fullWidth={true}
      onClose={handleClose}
      classes={{
        paper: classes.paper
      }}
    >
      <DialogTitle
        classes={{
          root: classes.dialogTitle
        }}
      >
        {t('CreateCroupTitle')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          <StringElement
            description={t('GroupName')}
            fullWidth={true}
            darkTheme={true}
            required={true}
            variant={'outlined'}
            inputProps={{ maxLength: 255 }}
            autoFocus={true}
            onChange={(value) => setGroupName(value)}
            value={groupName}
            error={
              error
                ? {
                    keyword: '',
                    message: error
                  }
                : null
            }
          />
          <ProgressLine loading={loading} classes={classes.progressLineWrapper} />
        </DialogContentText>
      </DialogContent>
      <DialogActions
        classes={{
          root: classes.dialogAction
        }}
      >
        {activeGroup && !readOnly ? (
          <Button
            classes={{
              root: classes.closeAction
            }}
            onClick={handleDeleteGroup}
          >
            <DeleteOutlineOutlinedIcon className={classes.icon} />
            {t('Delete')}
          </Button>
        ) : (
          <div />
        )}

        <div>
          <Button
            onClick={handleClose}
            classes={{
              root: classes.closeAction
            }}
          >
            {t('Close')}
          </Button>

          {readOnly ? (
            <div />
          ) : (
            <Button
              variant="contained"
              color="primary"
              classes={{
                root: classes.saveAction
              }}
              onClick={handleSave}
            >
              {t('Save')}
            </Button>
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
};

export default CreateGroup;

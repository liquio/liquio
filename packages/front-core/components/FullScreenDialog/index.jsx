import { Dialog, Toolbar, Typography, IconButton, DialogContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import CloseIcon from '@mui/icons-material/Close';
import classNames from 'classnames';

const styles = {
  header: {
    padding: 0,
    backgroundColor: '#232323',
    height: 32
  },
  title: {
    flexGrow: 1,
    color: '#E2E2E2',
    padding: '0 10px'
  },
  button: {
    color: '#E2E2E2!important'
  },
  runButton: {
    color: '#4caf50',
    marginRight: 4
  },
  disableClose: {
    opacity: 0.5
  },
  dialog: {
    display: 'flex',
    '& .ace_editor': {
      flex: 1
    }
  },
  content: {
    padding: 0
  },
  overflow: {
    overflow: 'hidden'
  }
};

const FullScreenDialog = ({
  classes,
  title,
  open,
  onClose,
  disableClose = false,
  actions = null,
  beforeTitle = null,
  children,
  disableEscapeKeyDown,
  disableScrollBody,
  titleTextAlign = 'left',
  ...rest
}) => {
  const handleClose = (event) => {
    if (disableClose) {
      event.stopPropagation();
      return;
    }
    onClose(event);
  };

  return (
    <Dialog
      {...rest}
      open={open}
      onClose={handleClose}
      fullScreen={true}
      fullWidth={true}
      disableEscapeKeyDown={disableEscapeKeyDown}
    >
      <Toolbar className={classes.header}>
        {beforeTitle}
        <Typography
          variant="subtitle1"
          className={classes.title}
          style={{ textAlign: titleTextAlign }}
        >
          {title}
        </Typography>
        {actions}
        <IconButton
          disabled={disableClose}
          className={{
            [classes.button]: true,
            [classes.disableClose]: disableClose
          }}
          onClick={handleClose}
          size="large"
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>

      <DialogContent
        className={classNames({
          [classes.content]: true,
          [classes.overflow]: disableScrollBody
        })}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default withStyles(styles)(FullScreenDialog);

import React from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Popover , Alert, AlertTitle } from '@mui/material';
import { makeStyles } from '@mui/styles';

export const MESSAGE_TYPES = {
  info: {
    Icon: InfoOutlinedIcon,
    color: '#2196f3'
  },
  warning: {
    Icon: ReportProblemOutlinedIcon,
    color: '#ff9800'
  },
  success: {
    Icon: CheckCircleOutlinedIcon,
    color: '#4caf50'
  },
  error: {
    Icon: ErrorOutlineOutlinedIcon,
    color: '#f44336'
  }
};

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column'
  },
  popover: {
    pointerEvents: 'none'
  },
  paper: {
    padding: 0
  }
}));

const FormControlMessage = ({ children, size, message: { type = 'warning', title, text } }) => {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { Icon, color } = MESSAGE_TYPES[type] || MESSAGE_TYPES['warning'];

  const handlePopoverOpen = (event) => setAnchorEl(event.currentTarget);
  const handlePopoverClose = () => setAnchorEl(null);

  return (
    <div className={classes.root} style={{ color }}>
      {children}
      <Icon fontSize={size} onMouseEnter={handlePopoverOpen} onMouseLeave={handlePopoverClose} />
      <Popover
        className={classes.popover}
        classes={{
          paper: classes.paper
        }}
        open={!!anchorEl}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center'
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Alert severity={type}>
          {title ? <AlertTitle>{title}</AlertTitle> : null}
          {text}
        </Alert>
      </Popover>
    </div>
  );
};

export default FormControlMessage;

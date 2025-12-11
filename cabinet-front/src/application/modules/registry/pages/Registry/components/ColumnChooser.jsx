import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import withStyles from '@mui/styles/withStyles';

const styles = {
  btn: {
    '&:focus-visible': {
      outline: '3px solid #0073E6',
      outlineOffset: '2px'
    }
  }
};

const ColumnChooserWrapper = ({ onToggle, buttonRef, tooltipMessage, classes }) => (
  <Tooltip title={tooltipMessage} placement="bottom" enterDelay={300}>
    <IconButton onClick={onToggle} ref={buttonRef} size="large" className={classes.btn}>
      <ViewColumnIcon style={{ color: '#000' }} />
    </IconButton>
  </Tooltip>
);

const styled = withStyles(styles)(ColumnChooserWrapper);
export default styled;

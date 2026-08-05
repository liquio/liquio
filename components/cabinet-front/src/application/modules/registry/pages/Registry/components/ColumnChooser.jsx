import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import withStyles from '@mui/styles/withStyles';

const styles = (theme) => ({
  btn: {
    '&:focus-visible': {
      outline: `3px solid ${theme?.outlineColor || theme?.palette?.primary?.main}`,
      outlineOffset: '2px'
    }
  },
  icon: {
    color: theme?.textColorDark || theme?.palette?.text?.primary
  }
});

const ColumnChooserWrapper = ({ onToggle, buttonRef, tooltipMessage, classes }) => (
  <Tooltip title={tooltipMessage} placement="bottom" enterDelay={300}>
    <IconButton onClick={onToggle} ref={buttonRef} size="large" className={classes.btn}>
      <ViewColumnIcon className={classes.icon} />
    </IconButton>
  </Tooltip>
);

const styled = withStyles(styles)(ColumnChooserWrapper);
export default styled;

import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { Dialog, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFileOutlined';

const styles = {
  modal: {
    '& > div > div': {
      '@media screen and (max-width: 425px)': {
        margin: 15
      }
    }
  },
  navlink: {
    textDecoration: 'none',
    color: '#000'
  }
};

const SelectEntryTaskDialog = ({ classes, template, open, onClose }) =>
  template ? (
    <Dialog maxWidth="sm" fullWidth={true} open={open} onClose={onClose} className={classes.modal}>
      <List component="nav">
        {template.entryTaskTemplateIds
          .filter(({ hidden }) => !hidden)
          .map((taskTemplate) => (
            <NavLink
              key={taskTemplate.id}
              to={'/tasks/create/' + (template.itemId || template.id) + '/' + taskTemplate.id}
              className={classes.navlink}
            >
              <ListItem className={classes.item} button={true}>
                <ListItemIcon className={classes.mobileIcon}>
                  <InsertDriveFileIcon />
                </ListItemIcon>
                <ListItemText inset={true} primary={taskTemplate.name} />
              </ListItem>
            </NavLink>
          ))}
      </List>
    </Dialog>
  ) : null;

SelectEntryTaskDialog.propTypes = {
  classes: PropTypes.object.isRequired,
  template: PropTypes.object,
  open: PropTypes.bool,
  onClose: PropTypes.func
};

SelectEntryTaskDialog.defaultProps = {
  template: null,
  open: false,
  onClose: () => null
};

export default withStyles(styles)(SelectEntryTaskDialog);

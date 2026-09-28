import React from 'react';
import { NavLink } from 'react-router-dom';
import { Dialog, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFileOutlined';

type ThemeWithText = { palette: { text: { primary: string } } };

const styles = (theme: ThemeWithText) => ({
  modal: {
    '& > div > div': {
      '@media screen and (max-width: 425px)': {
        margin: 15
      }
    }
  },
  navlink: {
    textDecoration: 'none',
    color: theme?.palette?.text?.primary
  }
});

interface EntryTaskTemplate {
  id: string | number;
  name?: string;
  hidden?: boolean;
}

interface TaskTemplate {
  id?: string | number;
  itemId?: string | number;
  entryTaskTemplateIds: EntryTaskTemplate[];
}

interface SelectEntryTaskDialogProps {
  classes: Record<string, string>;
  template?: TaskTemplate | null;
  open?: boolean;
  onClose?: () => void;
}

const SelectEntryTaskDialog = ({ classes, template = null, open = false, onClose = () => null }: SelectEntryTaskDialogProps) =>
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
              <ListItem
                {...({
                  className: (classes as { item?: string }).item,
                  button: true,
                } as unknown as Record<string, unknown>)}
              >
                <ListItemIcon className={(classes as { mobileIcon?: string }).mobileIcon}>
                  <InsertDriveFileIcon />
                </ListItemIcon>
                <ListItemText inset={true} primary={taskTemplate.name} />
              </ListItem>
            </NavLink>
          ))}
      </List>
    </Dialog>
  ) : null;

export default withStyles(styles)(SelectEntryTaskDialog as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

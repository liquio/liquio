import React from 'react';
import { List, ListItem, ListItemText, ListItemIcon, CircularProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import FileName from 'components/Attach/FileName';
import renderHTML from 'helpers/renderHTML';

const styles = (theme) => ({
  list: {
    padding: 8,
    paddingLeft: 0,
    flex: '0 1 100%',
    background: 'transparent',
    [theme.breakpoints.down('md')]: {
      padding: 0,
      maxWidth: 'calc(100% - 16px)'
    }
  },
  listItem: {
    padding: 0
  },
  listItemText: {
    padding: 0,
    margin: 0,
    [theme.breakpoints.down('md')]: {
      padding: 0
    }
  },
  iconWrap: {
    marginRight: 10,
    minWidth: 'unset'
  },
  listItemTextPrimary: {
    minWidth: 150,
    wordBreak: 'break-word'
  }
});

const FileNameColumn = ({
  classes,
  item,
  name,
  customName,
  whiteSpace,
  meta,
  cutLine,
  isDataGrid
}) => {
  if (isDataGrid) {
    return (
      <FileName whiteSpace={whiteSpace} cutLine={cutLine}>
        {customName ? renderHTML(customName) : meta || name}
      </FileName>
    );
  }

  return (
    <List className={classes.list}>
      <ListItem className={classes.listItem}>
        {item instanceof File ? (
          <ListItemIcon classes={{ root: classes.iconWrap }}>
            <CircularProgress size={16} />
          </ListItemIcon>
        ) : null}
        <ListItemText
          inset={true}
          className={classes.listItemText}
          classes={{ primary: classes.listItemTextPrimary }}
          primary={
            <FileName whiteSpace={whiteSpace} cutLine={cutLine}>
              {customName ? renderHTML(customName) : meta || name}
            </FileName>
          }
          tabIndex={0}
        />
      </ListItem>
    </List>
  );
};

export default withStyles(styles)(FileNameColumn);

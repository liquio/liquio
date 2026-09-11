import React from 'react';
import { ImageListItem, Card, CardContent, List, ListItem, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = {
  card: {
    marginRight: 10,
    marginBottom: 10,
    padding: 0,
    width: 320
  }
};

const DataTableCard = ({ classes, item, columns = [] }) => (
  <ImageListItem cols={2}>
    <Card className={classes.card}>
      <CardContent>
        <List>
          {columns.map(({ id, name, render }, columnKey) => (
            <ListItem key={columnKey}>
              <ListItemText
                primary={render ? render(item[id], item, columnKey) : item[id]}
                secondary={name}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  </ImageListItem>
);

export default withStyles(styles)(DataTableCard);

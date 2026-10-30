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

interface Column {
  id: string;
  name?: string;
  render?: (value: unknown, item: Record<string, unknown>, columnKey: number) => React.ReactNode;
}

interface DataTableCardProps {
  classes: Record<string, string>;
  item: Record<string, unknown>;
  columns?: Column[];
}

const DataTableCard = ({ classes, item, columns = [] }: DataTableCardProps) => (
  <ImageListItem cols={2}>
    <Card className={classes.card}>
      <CardContent>
        <List>
          {columns.map(({ id, name, render }, columnKey) => (
            <ListItem key={columnKey}>
              <ListItemText
                primary={render ? render(item[id], item, columnKey) : (item[id] as React.ReactNode)}
                secondary={name}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  </ImageListItem>
);

export default withStyles(styles)(DataTableCard as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

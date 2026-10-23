import React from 'react';

import { List } from '@mui/material';

import { makeStyles } from '@mui/styles';

import TreeListItem, { TreeViewRest } from './TreeListItem';

const withStyles = makeStyles({
  root: {},
});

interface TreeViewListProps extends TreeViewRest {
  list?: Record<string, unknown>;
}

const TreeViewList = ({ list = {}, path = [], ...rest }: TreeViewListProps) => {
  const classes = withStyles();
  const keys = Object.keys(list);

  return (
    <List component="nav" disablePadding={true} className={classes.root}>
      {keys.map((key, index) => (
        <TreeListItem
          {...rest}
          key={index}
          path={path.concat(key)}
          itemKey={key}
          item={list[key]}
        />
      ))}
    </List>
  );
};

export default TreeViewList;

import React from 'react';

import { makeStyles } from '@mui/styles';

import TreeViewList from 'components/TreeView/TreeViewList';
import type { TreeViewRest } from 'components/TreeView/TreeListItem';

const withStyles = makeStyles({
  root: {},
});

interface TreeViewProps extends TreeViewRest {
  value?: Record<string, unknown>;
}

const TreeView = ({ value, ...rest }: TreeViewProps) => {
  const classes = withStyles();

  return (
    <div className={classes.root}>
      <TreeViewList {...rest} list={value} />
    </div>
  );
};

export default TreeView;

import React from 'react';

import { makeStyles } from '@mui/styles';

import TreeViewList from 'components/TreeView/TreeViewList';

const withStyles = makeStyles({
  root: {},
});

const TreeView = ({ value, ...rest }) => {
  const classes = withStyles();

  return (
    <div className={classes.root}>
      <TreeViewList {...rest} list={value} />
    </div>
  );
};

export default TreeView;

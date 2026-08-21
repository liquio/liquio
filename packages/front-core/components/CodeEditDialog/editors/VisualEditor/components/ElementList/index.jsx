import React from 'react';
import { makeStyles } from '@mui/styles';

import Scrollbar from 'components/Scrollbar';
import { withEditor } from './../../JsonSchemaProvider';
import GroupedElementList from './components/GroupedElementList';
import snippets from './components/snippets';

const withStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '#757575 1px solid'
  },
  divider: {
    margin: '0 4px',
    backgroundColor: '#757575'
  },
  opened: {
    width: 300
  },
  search: {
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 25,
    marginTop: 10
  }
});

const ElementList = () => {
  const classes = withStyles();

  return (
    <div className={classes.root}>
      <Scrollbar options={{ disableHorizontalScrolling: true }}>
        <GroupedElementList snippets={snippets} visualEditor={true} readOnly={true} />
      </Scrollbar>
    </div>
  );
};

export default withEditor(ElementList);

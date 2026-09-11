import React from 'react';
import objectPath from 'object-path';
import json5 from 'json5';
import { makeStyles } from '@mui/styles';
import Scrollbar from 'components/Scrollbar';
import { withEditor } from 'components/JsonSchema/editor/JsonSchemaProvider';
import getElementType from 'components/JsonSchema/editor/helpers/getElementType';
import SchemaItem from './components/SchemaItem';
import ElementList from './components/ElementList';

const withStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    height: 'calc(100% - 48px)',
  },
  mainPane: {
    flex: 1,
    borderRight: '#757575 1px solid',
  },
}));

const VisualEditor = ({ newValue, editPath }) => {
  const classes = withStyles();

  const parsedValue = React.useMemo(() => {
    try {
      return JSON.parse(newValue);
    } catch {
      try {
        return json5.parse(newValue);
      } catch {
        return {};
      }
    }
  }, [newValue]);

  return (
    <div className={classes.root}>
      <ElementList />
      <div className={classes.mainPane}>
        <Scrollbar>
          <SchemaItem
            path={editPath}
            value={objectPath.get(parsedValue, editPath)}
            elementType={getElementType(null, editPath)}
          />
        </Scrollbar>
      </div>
    </div>
  );
};

export default withEditor(VisualEditor);

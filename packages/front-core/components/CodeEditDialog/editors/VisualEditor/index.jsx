import React from 'react';
import objectPath from 'object-path';
import json5 from 'json5';
import { makeStyles } from '@mui/styles';

import Scrollbar from 'components/Scrollbar';
import { withEditor, Editor } from './JsonSchemaProvider';
import getElementType from 'components/JsonSchema/editor/helpers/getElementType';
import SchemaItem from './components/SchemaItem';
import ElementList from './components/ElementList';

const withStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    width: '100%',
    height: '100vh'
  },
  mainPane: {
    flex: 1,
    height: '100%',
    width: '100%',
    borderRight: '#757575 1px solid'
  }
}));

const VisualEditor = (props) => {
  const { value, editPath = [] } = props;

  const classes = withStyles();

  const parsedValue = React.useMemo(() => {
    try {
      return JSON.parse(value);
    } catch {
      try {
        return json5.parse(value);
      } catch {
        return {};
      }
    }
  }, [value]);

  return (
    <JsonSchemaEditor {...props} handleSaveOnChange={true}>
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
    </JsonSchemaEditor>
  );
};

const JsonSchemaEditor = ({ children, ...rest }) => <Editor {...rest}>{children}</Editor>;

export default withEditor(VisualEditor);

import React from 'react';

import withStyles from '@mui/styles/withStyles';

import Scrollbar from 'components/Scrollbar';
import SchemaForm from 'components/JsonSchema/SchemaForm';
import PropertyTree from 'components/JsonSchema/elements/PropertyList/PropertyTree';

import objectPath from 'object-path';

const styles = {
  root: {
    display: 'flex',
  },
  tree: {
    width: 320,
  },
  display: {
    flex: 1,
    padding: '0 40px',
    display: 'grid',
  },
};

const PropertyList = ({ classes, schema, value, readOnly, onChange }) => {
  const [path, setPath] = React.useState(
    [Object.keys(schema.properties)[0]].filter(Boolean),
  );

  const activeProperty = objectPath.get(
    schema.properties,
    path.join('.properties.'),
  );
  const activePropertyValue = objectPath.get(value, path);

  return (
    <div className={classes.root}>
      <div className={classes.tree}>
        <Scrollbar>
          <PropertyTree
            path={[]}
            active={path}
            properties={schema.properties}
            setPath={setPath}
          />
        </Scrollbar>
      </div>
      <div className={classes.display}>
        <Scrollbar>
          <SchemaForm
            schema={activeProperty}
            path={path}
            name={path[path.length - 1]}
            readOnly={readOnly}
            value={activePropertyValue}
            onChange={onChange.bind(null, ...path)}
          />
        </Scrollbar>
      </div>
    </div>
  );
};

export default withStyles(styles)(PropertyList);

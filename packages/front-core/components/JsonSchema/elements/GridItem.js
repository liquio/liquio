/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { Grid } from '@mui/material';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';

const GridItem = ({
  params,
  properties,
  readOnly,
  container = false,
  item = false,
  spacing = 2,
  rootDocument,
  hidden,
  ...rest
}) => {
  const [value, setValue] = React.useState({});

  if (hidden) return null;

  return (
    <Grid container={container} item={item} spacing={spacing} {...params}>
      {Object.keys(properties || {}).map((key) => (
        <SchemaForm
          {...rest}
          key={key}
          rootDocument={rootDocument}
          schema={properties[key]}
          readOnly={readOnly || properties[key].readOnly}
          value={value}
          onChange={handleChangeAdapter(value, (value, { changes }) =>
            setValue(changes),
          )}
        />
      ))}
    </Grid>
  );
};

export default GridItem;

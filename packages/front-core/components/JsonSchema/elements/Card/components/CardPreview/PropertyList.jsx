import React from 'react';
import objectPath from 'object-path';

import { ListItem, ListItemText } from '@mui/material';

import { makeStyles } from '@mui/styles';

import evaluate from 'helpers/evaluate';

const withStyles = makeStyles({
  primary: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.54)',
  },
  secondary: {
    color: 'rgba(0, 0, 0, 1)',
  },
});

const stringify = (value) =>
  value.name || value.label || value.stringified || JSON.stringify(value);

const toString = (value) => {
  let result = value;

  if (Array.isArray(result)) {
    result = [].concat(result).filter(Boolean).map(stringify).join();
  }

  if (typeof result === 'object') {
    while (typeof result === 'object') {
      result = stringify(result);
    }
  }

  return result;
};

const PropertyList = ({ schema, value = {} }) => {
  const classes = withStyles();

  const previewProperties = React.useMemo(() => {
    if (schema.previewProperties) {
      const schemaPreviewProperties = evaluate(schema.previewProperties, value);

      return Object.keys(schemaPreviewProperties).reduce(
        (acc, key) => ({
          ...acc,
          [key]: objectPath.get(value, schemaPreviewProperties[key]),
        }),
        {},
      );
    }

    return Object.keys(schema.properties).reduce(
      (acc, key) => ({
        ...acc,
        [schema.properties[key].description || key]: value[key],
      }),
      {},
    );
  }, [schema.previewProperties, schema.properties, value]);

  return Object.keys(previewProperties)
    .filter((key) => previewProperties[key])
    .map((key, index) => (
      <ListItem key={index}>
        <ListItemText
          classes={classes}
          secondary={toString(previewProperties[key] ?? '-')}
          primary={key}
        />
      </ListItem>
    ));
};

export default PropertyList;

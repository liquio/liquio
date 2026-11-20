import React from 'react';
import objectPath from 'object-path';

import { ListItem, ListItemText } from '@mui/material';

import { makeStyles } from '@mui/styles';

import evaluate from 'helpers/evaluate';
import { JsonSchemaNode } from '../../../../types';

const withStyles = makeStyles({
  primary: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.54)',
  },
  secondary: {
    color: 'rgba(0, 0, 0, 1)',
  },
});

interface StringifiableValue {
  name?: string;
  label?: string;
  stringified?: string;
  [key: string]: unknown;
}

const stringify = (value: StringifiableValue): string =>
  value.name || value.label || value.stringified || JSON.stringify(value);

const toString = (value: unknown): string => {
  let result: unknown = value;

  if (Array.isArray(result)) {
    result = ([] as unknown[]).concat(result).filter(Boolean).map((item) => stringify(item as StringifiableValue)).join();
  }

  if (typeof result === 'object' && result !== null) {
    while (typeof result === 'object' && result !== null) {
      result = stringify(result as StringifiableValue);
    }
  }

  return result as string;
};

interface PropertyListProps {
  schema: JsonSchemaNode & { previewProperties?: unknown; properties?: Record<string, JsonSchemaNode> };
  value?: Record<string, unknown>;
}

const PropertyList = ({ schema, value = {} }: PropertyListProps) => {
  const classes = withStyles();

  const previewProperties = React.useMemo(() => {
    if (schema.previewProperties) {
      const schemaPreviewProperties = evaluate(schema.previewProperties as string, value) as Record<string, string>;

      return Object.keys(schemaPreviewProperties).reduce(
        (acc, key) => ({
          ...acc,
          [key]: objectPath.get(value, schemaPreviewProperties[key]),
        }),
        {} as Record<string, unknown>,
      );
    }

    return Object.keys(schema.properties || {}).reduce(
      (acc, key) => ({
        ...acc,
        [((schema.properties as Record<string, JsonSchemaNode>)[key].description as string) || key]: value[key],
      }),
      {} as Record<string, unknown>,
    );
  }, [schema.previewProperties, schema.properties, value]);

  return (
    <>
      {Object.keys(previewProperties)
        .filter((key) => previewProperties[key])
        .map((key, index) => (
          <ListItem key={index}>
            <ListItemText
              classes={classes}
              secondary={toString(previewProperties[key] ?? '-')}
              primary={key}
            />
          </ListItem>
        ))}
    </>
  );
};

export default PropertyList;

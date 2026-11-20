/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { Grid } from '@mui/material';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';

interface GridItemProps {
  params?: Record<string, unknown>;
  properties?: Record<string, { readOnly?: boolean; [key: string]: unknown }>;
  readOnly?: boolean;
  container?: boolean;
  item?: boolean;
  spacing?: number;
  rootDocument: { data: Record<string, unknown> };
  hidden?: boolean;
  [key: string]: unknown;
}

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
}: GridItemProps) => {
  const [value, setValue] = React.useState({});

  if (hidden) return null;

  return (
    <Grid container={container} item={item} spacing={spacing} {...params}>
      {Object.keys(properties || {}).map((key) => (
        <SchemaForm
          {...rest}
          key={key}
          rootDocument={rootDocument}
          schema={properties?.[key]}
          readOnly={readOnly || properties?.[key]?.readOnly}
          value={value}
          onChange={handleChangeAdapter(value, (_value: unknown, { changes }: { changes: unknown }) =>
            setValue(changes as Record<string, unknown>),
          )}
        />
      ))}
    </Grid>
  );
};

export default GridItem;

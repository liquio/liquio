import React from 'react';

import formElements from 'components/JsonSchema/elements';
import getFormElementName from 'components/JsonSchema/helpers/getFormElementName';
import { JsonSchemaNode } from './types';

interface SchemaPreviewProps {
  customControls?: Record<string, React.ComponentType<Record<string, unknown>> & { Preview?: React.ComponentType<Record<string, unknown>> }>;
  defaultPreview?: React.ReactNode;
  schema: JsonSchemaNode;
  [key: string]: unknown;
}

const SchemaPreview = ({
  customControls = {},
  defaultPreview = null,
  schema,
  ...rest
}: SchemaPreviewProps) => {
  const formControl = ({ ...formElements, ...customControls } as unknown as Record<string, { Preview?: React.ComponentType<Record<string, unknown>> } | undefined>)[
    getFormElementName(schema) as string
  ];
  const PreviewControl = formControl && formControl.Preview;

  return PreviewControl ? (
    <PreviewControl {...rest} schema={schema} />
  ) : (
    defaultPreview
  );
};

export default SchemaPreview;

import React from 'react';

import formElements from 'components/JsonSchema/elements';
import getFormElementName from 'components/JsonSchema/helpers/getFormElementName';

const SchemaPreview = ({
  customControls = {},
  defaultPreview = null,
  schema,
  ...rest
}) => {
  const formControl = { ...formElements, ...customControls }[
    getFormElementName(schema)
  ];
  const PreviewControl = formControl && formControl.Preview;

  return PreviewControl ? (
    <PreviewControl {...rest} schema={schema} />
  ) : (
    defaultPreview
  );
};

export default SchemaPreview;

import React from 'react';

import ObjectElement from 'components/JsonSchema/elements/ObjectElement';
import objectPath from 'object-path';

export const Portal = (props) => {
  const {
    schema: { path },
    rootDocument,
    actions: { handleChange },
  } = props;
  const portalPath = Array.isArray(path) ? path : path.split('.');

  return (
    <ObjectElement
      {...props}
      path={portalPath}
      onChange={handleChange.bind(null, ...portalPath)}
      value={objectPath.get(rootDocument.data, portalPath)}
    />
  );
};

export default Portal;

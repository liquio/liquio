import React from 'react';

import ObjectElement from 'components/JsonSchema/elements/ObjectElement';
import objectPath from 'object-path';

interface PortalProps {
  schema: { path: string | Array<string | number> };
  rootDocument: { data: Record<string, unknown> };
  actions: { handleChange: (...args: unknown[]) => void };
  [key: string]: unknown;
}

export const Portal = (props: PortalProps) => {
  const {
    schema: { path },
    rootDocument,
    actions: { handleChange },
  } = props;
  const portalPath = Array.isArray(path) ? path : path.split('.');

  return (
    <ObjectElement
      {...(props as unknown as Record<string, unknown>)}
      schema={props.schema as never}
      path={portalPath}
      onChange={handleChange.bind(null, ...portalPath)}
      value={objectPath.get(rootDocument.data, portalPath)}
    />
  );
};

export default Portal;

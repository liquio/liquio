/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';

import ElementGroupContainer from 'components/JsonSchema/components/ElementGroupContainer';

interface ArrayElementContainerProps {
  description?: string;
  sample?: string;
  error?: unknown;
  required?: boolean;
  width?: number | null;
  maxWidth?: number | null;
  children: React.ReactNode;
  typography?: string;
  [key: string]: unknown;
}

const ArrayElementContainer = ({
  description = '',
  sample = '',
  error = null,
  required = false,
  width = null,
  maxWidth = null,
  children,
  typography = 'subtitle1',
  ...rest
}: ArrayElementContainerProps) => (
  <ElementGroupContainer
    description={description}
    sample={sample}
    error={error}
    required={required}
    width={width as never}
    maxWidth={maxWidth as never}
    variant={typography as never}
    {...rest}
  >
    {children}
  </ElementGroupContainer>
);

export default ArrayElementContainer;

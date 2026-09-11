import React from 'react';
import TextToken from './TextToken';
import NameToken from './NameToken';

const tokens: Record<string, React.ComponentType<Record<string, unknown>>> = {
  text: TextToken,
  name: NameToken as unknown as React.ComponentType<Record<string, unknown>>
};

export default tokens;

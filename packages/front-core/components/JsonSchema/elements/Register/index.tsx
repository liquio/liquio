import React from 'react';

import RelatedKeyRegister from 'components/JsonSchema/elements/Register/RelatedKeyRegister';
import SingleKeyRegister from 'components/JsonSchema/elements/Register/SingleKeyRegister';

interface RegisterComponentProps {
  keyId?: number | null;
  [key: string]: unknown;
}

const RegisterComponent = (props: RegisterComponentProps) => {
  const { keyId = null } = props;

  if (keyId) {
    return <SingleKeyRegister {...(props as unknown as Record<string, unknown>)} />;
  }

  return <RelatedKeyRegister {...(props as unknown as Record<string, unknown>)} />;
};

export default RegisterComponent;

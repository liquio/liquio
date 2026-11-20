import React from 'react';

import Layout from 'layouts/topHeader';
import OwnKeyLogin from './OwnKeyLogin';
import MainPage from './MainPage';
import CredentialMethod from './CredentialMethod';
import type { CredentialMethodState, LoginStepProps } from './types';

const DefaultLoginLayout = ({ setId = () => null, ...rest }: LoginStepProps) => {
  const [loginByOwnKey, setLoginByOwnKey] = React.useState(false);
  const [credentialMethod, setCredentialMethod] = React.useState<CredentialMethodState>(false);
  const props = { ...rest, setId };

  // Only the never-used default `setId` returns `null`; the layout just builds `id` attributes from it.
  // `loginByOwnKey` is no longer passed to the layout: `layouts/topHeader` never reads it.
  return (
    <Layout setId={setId as (elementName: string) => string}>
      {loginByOwnKey ? (
        <OwnKeyLogin setLoginByOwnKey={setLoginByOwnKey} {...props} />
      ) : credentialMethod ? (
        <CredentialMethod onClose={setCredentialMethod} additionalProps={credentialMethod} {...props} />
      ) : (
        <MainPage setLoginByOwnKey={setLoginByOwnKey} setCredentialMethod={setCredentialMethod} {...props} />
      )}
    </Layout>
  );
};

export default DefaultLoginLayout;

import React from 'react';
import PropTypes from 'prop-types';

import Layout from 'layouts/topHeader';
import OwnKeyLogin from './OwnKeyLogin';
import MainPage from './MainPage';
import CredentialMethod from './CredentialMethod';

const DefaultLoginLayout = (props) => {
  const [loginByOwnKey, setLoginByOwnKey] = React.useState(false);
  const [credentialMethod, setCredentialMethod] = React.useState(false);

  return (
    <Layout setId={props.setId} loginByOwnKey={loginByOwnKey}>
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

DefaultLoginLayout.propTypes = {
  setId: PropTypes.func,
};

DefaultLoginLayout.defaultProps = {
  setId: () => null,
};

export default DefaultLoginLayout;

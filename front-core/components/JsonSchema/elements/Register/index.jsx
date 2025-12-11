import React from 'react';
import PropTypes from 'prop-types';

import RelatedKeyRegister from 'components/JsonSchema/elements/Register/RelatedKeyRegister';
import SingleKeyRegister from 'components/JsonSchema/elements/Register/SingleKeyRegister';

const RegisterComponent = (props) => {
  const { keyId } = props;

  if (keyId) {
    return <SingleKeyRegister {...props} />;
  }

  return <RelatedKeyRegister {...props} />;
};

RegisterComponent.propTypes = {
  keyId: PropTypes.number,
};

RegisterComponent.defaultProps = {
  keyId: null,
};

export default RegisterComponent;

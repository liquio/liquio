import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';

import setComponentsId from 'helpers/setComponentsId';
import PKCS7SignForm from './PKCS7SignForm';

const PKCS7Form = ({ t, classes, setId, ...rest }) => {
  return (
    <>
      <PKCS7SignForm {...rest} t={t} classes={classes} setId={(elementName) => setId(`pkcs7-${elementName}`)} />
    </>
  );
};

PKCS7Form.propTypes = {
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
  onSelectKey: PropTypes.func.isRequired,
};

PKCS7Form.defaultProps = {
  setId: setComponentsId('sign-form-pkcs7'),
};

export default translate('SignForm')(PKCS7Form);

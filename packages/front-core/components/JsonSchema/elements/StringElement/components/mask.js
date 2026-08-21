import React from 'react';
import PropTypes from 'prop-types';
import InputMask from 'react-input-mask';

const Masked = ({ ref, ...props }) => (
  <InputMask {...props} maskChar={null} inputRef={ref} />
);

Masked.propTypes = {
  ref: PropTypes.node,
};

Masked.defaultProps = {
  ref: undefined,
};

export default Masked;

import React from 'react';
import PropTypes from 'prop-types';

const ElementWrapper = ({ wrapperClass, children }) => {
  if (!wrapperClass) {
    return children;
  }

  return <div className={wrapperClass}>{children}</div>;
};

ElementWrapper.propTypes = {
  wrapperClass: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired
};

ElementWrapper.defaultProps = {
  wrapperClass: null
};

export default ElementWrapper;

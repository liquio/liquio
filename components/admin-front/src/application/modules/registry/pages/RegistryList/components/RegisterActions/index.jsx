import React from 'react';
import PropTypes from 'prop-types';
import { Toolbar } from '@mui/material';
// import ExportRegisters from './ExportRegisters';
import EditRegisterMenuItem from './EditRegisterMenuItem';
import DeleteRegister from './DeleteRegister';

const RegisterActions = ({ register, actions, readOnly }) => {
  const menuItemProps = {
    actions,
    register,
    onChange: actions.load,
  };

  if (readOnly) return null;

  return (
    <Toolbar disableGutters={true}>
      <EditRegisterMenuItem {...menuItemProps} />
      {/* <ExportRegisters {...menuItemProps} /> */}
      <DeleteRegister {...menuItemProps} />
    </Toolbar>
  );
};

RegisterActions.propTypes = {
  register: PropTypes.object,
  actions: PropTypes.object,
  readOnly: PropTypes.bool,
};

RegisterActions.defaultProps = {
  register: {},
  actions: {},
  readOnly: false,
};

export default RegisterActions;

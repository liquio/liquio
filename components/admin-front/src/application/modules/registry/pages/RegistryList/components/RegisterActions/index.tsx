import React from 'react';
import { Toolbar } from '@mui/material';
// import ExportRegisters from './ExportRegisters';
import EditRegisterMenuItemRaw from './EditRegisterMenuItem';
import DeleteRegisterRaw from './DeleteRegister';

const EditRegisterMenuItem = EditRegisterMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteRegister = DeleteRegisterRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface RegisterActionsProps {
  register?: Record<string, unknown>;
  actions?: { load?: () => void; [key: string]: unknown };
  readOnly?: boolean;
}

const RegisterActions = ({ register = {}, actions = {}, readOnly = false }: RegisterActionsProps) => {
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

export default RegisterActions;

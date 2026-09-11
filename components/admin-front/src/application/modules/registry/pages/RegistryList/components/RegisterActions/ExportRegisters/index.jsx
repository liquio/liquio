import React from 'react';
import { Tooltip, IconButton } from '@mui/material';
import { useTranslate } from 'react-translate';
import Exporticon from 'assets/img/export.svg';
import { ExportRegistryDialog } from './ExportRegistryDialog';

export const ExportRegisters = ({ register }) => {
  const t = useTranslate('RegistryListAdminPage');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('ExportRegister')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <img src={Exporticon} alt="export icon" width={20} />
        </IconButton>
      </Tooltip>
      <ExportRegistryDialog
        open={open}
        register={register}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default ExportRegisters;

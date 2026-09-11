import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import InterfaceDialog from 'modules/customInterfaces/pages/InterfacesList/components/InterfaceDialog';
import EditIcon from '@mui/icons-material/Edit';

const EditInterface = ({ t, value, onCommit, readOnly }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('EditInterface')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <EditIcon />
        </IconButton>
      </Tooltip>
      <InterfaceDialog
        open={open}
        value={value}
        onCommit={onCommit}
        onClose={() => setOpen(false)}
        readOnly={readOnly}
      />
    </>
  );
};

export default translate('InterfacesList')(EditInterface);

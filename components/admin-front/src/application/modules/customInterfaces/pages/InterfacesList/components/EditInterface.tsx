import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import InterfaceDialogRaw from 'modules/customInterfaces/pages/InterfacesList/components/InterfaceDialog';
import EditIcon from '@mui/icons-material/Edit';

const InterfaceDialog = InterfaceDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface InterfaceData {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

interface EditInterfaceProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  value: InterfaceData;
  onCommit: (data: InterfaceData) => Promise<void>;
  readOnly?: boolean;
}

const EditInterface = ({ t, value, onCommit, readOnly }: EditInterfaceProps) => {
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

export default translate('InterfacesList')(EditInterface as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

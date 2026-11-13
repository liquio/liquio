import React from 'react';
import { translate } from 'react-translate';
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import promiseChain from 'helpers/promiseChain';
import KeyFormModalRaw from '../KeyFormModal';
import { ReactComponent as JsonIcon } from 'assets/icons/JSON.svg';
import jsIcon from 'assets/icons/js_icon.svg';

const KeyFormModal = KeyFormModalRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface EditKeyMenuItemProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  registerKey: unknown;
  registerId: string;
  onClose?: () => void;
  actions: { saveKey: (data: unknown) => Promise<unknown>; load: () => void };
  readOnly?: boolean;
  type?: string | null;
}

const EditKeyMenuItem = ({
  t,
  registerKey,
  registerId,
  onClose = () => null,
  actions,
  readOnly = false,
  type = null,
}: EditKeyMenuItemProps) => {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => {
    setOpen(true);
    onClose();
  };

  const renderActionComponent = () => {
    switch (type) {
      case 'json':
        return (
          <Tooltip title={t('JSONEdit')}>
            <IconButton onClick={handleOpen} aria-label={t('JSONEdit')}>
              <JsonIcon width={24} height={24} aria-hidden="true" />
            </IconButton>
          </Tooltip>
        );
      case 'stringify':
        return (
          <MenuItem onClick={handleOpen}>
            <ListItemIcon>
              {<img src={jsIcon} alt={'json icon'} />}
            </ListItemIcon>
            <ListItemText primary={t('StringifyEdit')} />
          </MenuItem>
        );
      case 'toExport':
        return (
          <MenuItem onClick={handleOpen}>
            <ListItemIcon>{<img src={jsIcon} alt={'to icon'} />}</ListItemIcon>
            <ListItemText primary={t('ExportExcelFunction')} />
          </MenuItem>
        );
      case 'indexSearch':
        return (
          <MenuItem onClick={handleOpen}>
            <ListItemIcon>
              {<img src={jsIcon} alt={'json icon'} />}
            </ListItemIcon>
            <ListItemText primary={t('indexSearchEdit')} />
          </MenuItem>
        );
      default:
        return (
          <Tooltip title={t('EditKey')}>
            <IconButton onClick={handleOpen}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        );
    }
  };

  return (
    <>
      {renderActionComponent()}
      <KeyFormModal
        type={type}
        open={open}
        readOnly={readOnly}
        value={registerKey}
        registerId={registerId}
        onClose={() => setOpen(false)}
        onChange={(data: unknown) => promiseChain([actions.saveKey, actions.load] as never, data)}
      />
    </>
  );
};

export default translate('KeyListAdminPage')(EditKeyMenuItem as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

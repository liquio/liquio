import React from 'react';
import PropTypes from 'prop-types';
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
import KeyFormModal from '../KeyFormModal';
import jsonIcon from 'assets/icons/JSON.svg';
import jsIcon from 'assets/icons/js_icon.svg';

const EditKeyMenuItem = ({
  t,
  registerKey,
  registerId,
  onClose,
  actions,
  readOnly,
  type,
}) => {
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
            <IconButton onClick={handleOpen}>
              {<img src={jsonIcon} alt={'json icon'} />}
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
        onChange={(data) => promiseChain([actions.saveKey, actions.load], data)}
      />
    </>
  );
};

EditKeyMenuItem.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  registerKey: PropTypes.object.isRequired,
  registerId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  readOnly: PropTypes.bool,
  type: PropTypes.string,
};

EditKeyMenuItem.defaultProps = {
  onClose: () => null,
  readOnly: false,
  type: null,
};

export default translate('KeyListAdminPage')(EditKeyMenuItem);

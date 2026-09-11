import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import promiseChain from 'helpers/promiseChain';
import AccessFormModal from '../AccessFormModal';
import groupIcon from 'assets/icons/clarity_group-solid.svg';

const EditKeyMenuItem = ({ t, registerKey, registerId, onClose, actions }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('Access')}>
        <IconButton
          onClick={() => {
            setOpen(true);
            onClose();
          }}
        >
          <img src={groupIcon} alt="people icon" />
        </IconButton>
      </Tooltip>
      {open ? (
        <AccessFormModal
          value={registerKey}
          registerId={registerId}
          onClose={() => setOpen(false)}
          onChange={(data) =>
            promiseChain([actions.saveKey, actions.load], data)
          }
        />
      ) : null}
    </>
  );
};

EditKeyMenuItem.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  registerKey: PropTypes.object.isRequired,
  registerId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
};

EditKeyMenuItem.defaultProps = {
  onClose: () => null,
};

export default translate('KeyListAdminPage')(EditKeyMenuItem);

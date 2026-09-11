import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import ConfirmDialog from 'components/ConfirmDialog';
import promiseChain from 'helpers/promiseChain';
import DeleteIcon from 'assets/img/delete_icon.svg';

const DeleteRegister = ({ t, register, actions }) => {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(null);

  return (
    <>
      <Tooltip title={t('DeleteRegister')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <img src={DeleteIcon} alt="delete icon" width={20} />
        </IconButton>
      </Tooltip>

      <ConfirmDialog
        open={open}
        title={t('DeletePrompt', {
          register: register?.name,
        })}
        description={t('DeletePropmtDescription', {
          register: register?.name,
        })}
        handleClose={() => setOpen(false)}
        darkTheme={true}
        handleConfirm={async () => {
          try {
            await promiseChain(
              [actions.deleteRegister, actions.load, () => setOpen(false)],
              register.id,
            );
          } catch (e) {
            setError(e);
          }
        }}
      />
      <ConfirmDialog
        open={!!error}
        darkTheme={true}
        title={t('DeleteError', {
          deleting: register?.name + register?.id,
        })}
        description={t(error?.message)}
        handleClose={() => {
          setError(null);
          setOpen(false);
        }}
      />
    </>
  );
};

DeleteRegister.propTypes = {
  t: PropTypes.func.isRequired,
};

export default translate('RegistryListAdminPage')(DeleteRegister);

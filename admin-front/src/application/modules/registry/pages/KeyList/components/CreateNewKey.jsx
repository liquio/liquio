import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import AddIcon from 'assets/icons/add_icon.svg';

import promiseChain from 'helpers/promiseChain';
import KeyFormModal from './KeyFormModal';

const CreateNewKey = ({ t, actions, registerId, ColorButton, loading }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ColorButton
        variant="contained"
        color="primary"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        <img src={AddIcon} alt="DownloadIcon" />
        {t('CreateNew')}
      </ColorButton>

      <KeyFormModal
        open={open}
        newKey={true}
        registerId={registerId}
        onClose={() => setOpen(false)}
        onChange={(data) =>
          promiseChain([actions.createKey, actions.load], data)
        }
      />
    </>
  );
};

CreateNewKey.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  ColorButton: PropTypes.node.isRequired,
  registerId: PropTypes.string.isRequired,
};

export default translate('RegistryListAdminPage')(CreateNewKey);

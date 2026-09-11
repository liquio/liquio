import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import promiseChain from 'helpers/promiseChain';
import { SchemaFormModal } from 'components/JsonSchema';
import RegisterSelect from '../RegisterSelect';
import schema from '../../variables/registrySchema';

const EditRegisterMenuItem = ({ t, register, actions }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('EditRegister')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <EditIcon />
        </IconButton>
      </Tooltip>

      <SchemaFormModal
        open={open}
        value={register}
        translateError={t}
        schema={schema({ t })}
        title={t('EditRegister')}
        onClose={() => setOpen(false)}
        onChange={(data) =>
          promiseChain([actions.saveRegister, actions.load], data)
        }
        customControls={{
          RegisterSelect: (props) => (
            <RegisterSelect excludeKey={register && register.id} {...props} />
          ),
        }}
      />
    </>
  );
};

EditRegisterMenuItem.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  register: PropTypes.object.isRequired,
};

export default translate('RegistryListAdminPage')(EditRegisterMenuItem);

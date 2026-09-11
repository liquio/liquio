import React from 'react';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { SchemaFormModal } from 'components/JsonSchema';
import promiseChain from 'helpers/promiseChain';
import AddIcon from '@mui/icons-material/Add';
import RegisterSelect from './RegisterSelect';
import schema from '../variables/registrySchema';

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover,
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 6,
    },
  },
}))(Button);

const CreateNewRegister = ({ t, actions }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ColorButton
        variant="contained"
        color="primary"
        disableElevation={true}
        onClick={() => setOpen(true)}
      >
        <AddIcon />
        {t('CreateNew')}
      </ColorButton>
      <SchemaFormModal
        open={open}
        schema={schema({ t })}
        title={t('NewRegister')}
        onClose={() => setOpen(false)}
        translateError={t}
        onChange={(data) =>
          promiseChain([actions.createRegister, actions.load], data)
        }
        customControls={{
          RegisterSelect,
        }}
      />
    </>
  );
};

CreateNewRegister.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
};

export default translate('RegistryListAdminPage')(CreateNewRegister);

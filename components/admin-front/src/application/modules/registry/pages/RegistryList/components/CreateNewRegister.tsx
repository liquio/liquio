import React from 'react';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
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

interface CreateNewRegisterProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: { createRegister: (data: unknown) => Promise<unknown>; load: () => void };
}

const CreateNewRegister = ({ t, actions }: CreateNewRegisterProps) => {
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
        onChange={(data: unknown) =>
          promiseChain([actions.createRegister, actions.load] as never, data) as never
        }
        customControls={{
          RegisterSelect: RegisterSelect as never,
        }}
      />
    </>
  );
};

export default translate('RegistryListAdminPage')(CreateNewRegister as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

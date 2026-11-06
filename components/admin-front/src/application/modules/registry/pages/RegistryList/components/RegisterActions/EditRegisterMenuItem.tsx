import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import promiseChain from 'helpers/promiseChain';
import { SchemaFormModal } from 'components/JsonSchema';
import RegisterSelect from '../RegisterSelect';
import schema from '../../variables/registrySchema';

interface RegisterItem {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface EditRegisterMenuItemProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  register: RegisterItem;
  actions: { saveRegister: (data: unknown) => Promise<unknown>; load: () => void };
}

const EditRegisterMenuItem = ({ t, register, actions }: EditRegisterMenuItemProps) => {
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
        value={register as never}
        translateError={t}
        schema={schema({ t })}
        title={t('EditRegister')}
        onClose={() => setOpen(false)}
        onChange={(data: unknown) =>
          promiseChain([actions.saveRegister, actions.load] as never, data) as never
        }
        customControls={{
          RegisterSelect: (props: Record<string, unknown>) => (
            <RegisterSelect {...props} excludeKey={register && register.id} />
          ),
        }}
      />
    </>
  );
};

export default translate('RegistryListAdminPage')(EditRegisterMenuItem as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

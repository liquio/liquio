import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { SchemaFormModal } from 'components/JsonSchema';
import promiseChain from 'helpers/promiseChain';
import getSchema from '../../variables/schema';

interface NumberTemplate {
  id?: string | number;
  name?: string;
  template?: string;
}

interface EditTemplateProps {
  t: (key: string) => string;
  template: NumberTemplate;
  actions: {
    updateNumberTemplate: (data: unknown) => Promise<unknown>;
    load: () => void;
  };
  readOnly?: boolean;
}

const EditTemplate = ({ t, template, actions, readOnly }: EditTemplateProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('EditTemplate')}>
        <IconButton
          onClick={() => {
            setOpen(true);
          }}
          size="large"
        >
          <EditIcon />
        </IconButton>
      </Tooltip>
      <SchemaFormModal
        {...({
          title: t('EditTemplateData'),
          open,
          schema: getSchema({ t, readOnly }),
          value: template,
          onClose: () => setOpen(false),
          onChange: (data: unknown) =>
            promiseChain([actions.updateNumberTemplate, actions.load] as never, data as never),
        } as unknown as Record<string, unknown>)}
      />
    </>
  );
};

export default translate('NumberTemplateListPage')(EditTemplate as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { SchemaFormModal } from 'components/JsonSchema';
import promiseChain from 'helpers/promiseChain';
import getSchema from '../../variables/schema';

const EditTemplate = ({ t, template, actions, readOnly }) => {
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
        title={t('EditTemplateData')}
        open={open}
        schema={getSchema(readOnly)}
        value={template}
        onClose={() => setOpen(false)}
        onChange={(data) =>
          promiseChain([actions.updateNumberTemplate, actions.load], data)
        }
      />
    </>
  );
};

EditTemplate.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
};

export default translate('NumberTemplateListPage')(EditTemplate);

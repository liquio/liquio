import React from 'react';
import { Switch } from '@mui/material';

import DataTable from 'components/DataTable';
import { ElementGroupContainer } from 'components/JsonSchema';
import { getConfig } from '../../../../../../core/helpers/configLoader';

const BlocksAccess = ({ value: { menuConfig: { allowTokens = {} } = {} } = {}, onChange }) => {
  const config = getConfig();
  const { allowTokens: availableTokens } = config;
  return (
    <ElementGroupContainer>
      <DataTable
        data={availableTokens}
        controls={{
          pagination: false,
          toolbar: true,
          search: false,
          header: false,
          refresh: false,
          switchView: false,
          customizateColumns: false
        }}
        columns={[
          {
            id: 'id',
            width: 20,
            render: (id) => (
              <Switch
                checked={!!allowTokens[id]}
                onChange={({ target: { checked } }) =>
                  onChange.bind(
                    null,
                    'menuConfig',
                    'allowTokens'
                  )({ ...allowTokens, [id]: checked })
                }
              />
            )
          },
          {
            id: 'name'
          }
        ]}
      />
    </ElementGroupContainer>
  );
};

export default BlocksAccess;

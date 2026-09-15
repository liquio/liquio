import React from 'react';
import { Switch } from '@mui/material';

import DataTableRaw from 'components/DataTable';
import { ElementGroupContainer } from 'components/JsonSchema';
import { getConfig } from 'core/helpers/configLoader';

interface BlocksAccessProps {
  value?: { menuConfig?: { allowTokens?: Record<string, boolean> } };
  onChange: (...args: unknown[]) => void;
  // Passed by Unit/index.tsx alongside every other tab's component but
  // unused here — the original .jsx never destructured it either.
  readOnly?: boolean;
}

const BlocksAccess = ({ value: { menuConfig: { allowTokens = {} } = {} } = {}, onChange }: BlocksAccessProps) => {
  const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const config = getConfig() as unknown as { allowTokens?: { id: string; name?: string }[] };
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
            render: (id: string) => (
              <Switch
                checked={!!allowTokens[id]}
                onChange={({ target: { checked } }) =>
                  (onChange as (...args: unknown[]) => void).bind(
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

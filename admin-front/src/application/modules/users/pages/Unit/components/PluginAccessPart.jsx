import React from 'react';
import { Switch } from '@mui/material';
import { useTranslate } from 'react-translate';
import { makeStyles } from '@mui/styles';

import DataTable from 'components/DataTable';
import { ElementGroupContainer } from 'components/JsonSchema';
import { getConfig } from 'core/helpers/configLoader';

const withStyles = makeStyles({
  plagins: {
    color: 'white'
  }
});

const PluginAccessPart = ({
  value: { menuConfig: { plugins = {} } = {} } = {},
  onChange,
  readOnly
}) => {
  const config = getConfig();
  const { plugins: availablePlugins = [] } = config;

  const t = useTranslate('WorkflowAdminPage');
  const classes = withStyles();
  return (
    <ElementGroupContainer>
      {availablePlugins.length === 0 ? (
        <div className={classes.plagins}>{t('noPlagins')}</div>
      ) : (
        <DataTable
          data={availablePlugins}
          darkTheme={true}
          controls={{
            pagination: false,
            toolbar: false,
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
                  checked={!!plugins[id]}
                  disabled={readOnly}
                  onChange={({ target: { checked } }) =>
                    onChange.bind(null, 'menuConfig', 'plugins')({ ...plugins, [id]: checked })
                  }
                />
              )
            },
            {
              id: 'name'
            }
          ]}
        />
      )}
    </ElementGroupContainer>
  );
};

export default PluginAccessPart;

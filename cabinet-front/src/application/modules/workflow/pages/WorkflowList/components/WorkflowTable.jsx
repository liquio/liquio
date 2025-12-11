import React from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';

import EmptyPage from 'components/EmptyPage';
import dataTableConnect from 'services/dataTable/connectWithOwnProps';
import dataTableAdapter from 'services/dataTable/adapter';
import dataTableSettings from 'modules/workflow/pages/WorkflowList/variables/dataTableSettings';
import currentText from 'modules/workflow/pages/WorkflowList/components/currentText';
import DataGrid from 'components/DataGridPremium';
import BlockScreen from 'components/BlockScreenReforged';

const filtersToExclude = ['name', 'search', 'workflowStatusId'];

const WorkflowTable = (props) => {
  const {
    t,
    count,
    filters,
    loading,
    actions: { load },
    handleItemClick,
    TableToolbar,
    endPoint,
    data,
    setTitle,
    checkable
  } = React.useMemo(() => props, [props]);

  const isFiltered = React.useMemo(() => {
    return filtersToExclude.find((filter) => {
      const isKey = filter in filters;
      return isKey;
    });
  }, [filters]);

  const emptyResults = React.useMemo(() => !count && !isFiltered, [count, isFiltered]);

  const settings = React.useMemo(
    () => dataTableSettings({ t, filters, actions: { load }, checkable }),
    [t, filters, load, checkable]
  );

  const dataGridOptions = React.useMemo(() => {
    return {
      ..._.merge(settings, dataTableAdapter(props, endPoint))
    };
  }, [settings, props, endPoint]);

  React.useEffect(() => setTitle(emptyResults), [setTitle, emptyResults]);

  if (count === null && !isFiltered) {
    return <BlockScreen dataGrid={true} />;
  }

  if (emptyResults) {
    const { title, description, Icon } = currentText(filters);

    return <EmptyPage title={t(title)} description={t(description)} Icon={Icon} />;
  }

  return (
    <DataGrid
      rows={data}
      columns={settings.columns}
      actions={{}}
      loading={loading}
      onRowClick={handleItemClick}
      CustomToolbar={TableToolbar}
      {...dataGridOptions}
      showRowCount={true}
    />
  );
};

const translated = translate('WorkflowListPage')(WorkflowTable);
export default dataTableConnect(translated);

import React from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';
import { useTheme } from '@mui/material/styles';

import EmptyPageRaw from 'components/EmptyPage';
import dataTableConnect from 'services/dataTable/connectWithOwnProps';
import dataTableAdapter from 'services/dataTable/adapter';
import dataTableSettings from 'modules/workflow/pages/WorkflowList/variables/dataTableSettings';
import currentText from 'modules/workflow/pages/WorkflowList/components/currentText';
import DataGridRaw from 'components/DataGridPremium';
import BlockScreenRaw from 'components/BlockScreenReforged';
import type { DataTableEndpoint } from 'services/dataTable/types';

const EmptyPage = EmptyPageRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataGrid = DataGridRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;

const filtersToExclude = ['name', 'search', 'workflowStatusId'];

interface WorkflowTableProps {
  t: (key: string) => string;
  count: number | null;
  filters: Record<string, unknown>;
  loading: boolean;
  actions: { load: () => void; [key: string]: unknown };
  handleItemClick: (row: unknown) => void;
  TableToolbar?: React.ComponentType<Record<string, unknown>>;
  endPoint: DataTableEndpoint;
  data: unknown[];
  setTitle: (empty: boolean) => void;
  checkable?: boolean;
  [key: string]: unknown;
}

const WorkflowTable = (props: WorkflowTableProps) => {
  const theme = useTheme();
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
    () => dataTableSettings({ t, filters, actions: { load }, checkable, theme } as never),
    [t, filters, load, checkable, theme]
  );

  const dataGridOptions = React.useMemo((): Record<string, unknown> => {
    return {
      ..._.merge(settings, dataTableAdapter(props as never, endPoint))
    };
  }, [settings, props, endPoint]);

  React.useEffect(() => setTitle(!!emptyResults), [setTitle, emptyResults]);

  if (count === null && !isFiltered) {
    return <BlockScreen dataGrid={true} />;
  }

  if (emptyResults) {
    const { title, description, Icon } = currentText(filters as never);

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

const translated = translate('WorkflowListPage')(WorkflowTable as never);
export default dataTableConnect(translated as never);

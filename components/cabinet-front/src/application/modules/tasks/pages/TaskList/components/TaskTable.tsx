import React from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';
import { makeStyles } from '@mui/styles';

import EmptyPage from 'components/EmptyPage';
import dataTableSettings from 'modules/tasks/pages/TaskList/variables/dataTableSettings';
import DataGridRaw from 'components/DataGridPremium';
import BlockScreenRaw from 'components/BlockScreenReforged';
import controls from 'components/DataGridPremium/components/defaultProps';
import getTexts from './getEmptyTexts';

const DataGrid = DataGridRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;

const TaskListSearch = React.lazy(() => import('./TaskListSearch')) as unknown as React.ComponentType<
  Record<string, unknown>
>;

const useStyles = makeStyles(() => ({
  customActions: {
    display: 'flex',
    gap: '8px'
  }
}));

const filtersToExclude = [
  'name',
  'is_read',
  'workflowCreatedBy',
  'workflowName',
  'number',
  'performer_username',
  'from_created_at',
  'to_created_at'
];

interface TaskRow {
  meta?: { isRead?: boolean };
  finished?: boolean;
  id?: string | number;
  [key: string]: unknown;
}

interface TableProps {
  data: TaskRow[];
  count: number | null;
  filters: Record<string, unknown>;
  loading?: boolean;
  [key: string]: unknown;
}

interface TaskTableProps {
  t: (key: string) => string;
  handleItemClick: (row: TaskRow) => void;
  setTitle: (empty: boolean) => void;
  TableToolbar?: React.ComponentType<Record<string, unknown>> | null;
  tableProps: TableProps;
}

const TaskTable = (props: TaskTableProps) => {
  const { t, handleItemClick, setTitle, TableToolbar, tableProps } = React.useMemo(
    () => props,
    [props]
  );
  const classes = useStyles();
  const { data, count, filters, loading } = tableProps;
  const [selectedFilters, setSelectedFilters] = React.useState<unknown[]>([]);
  const [deletedFilter, setDeletedFilter] = React.useState<unknown>(null);
  const isFiltered = React.useMemo(() => {
    return filtersToExclude.find((filter) => {
      const isKey = filter in filters;
      return isKey;
    });
  }, [filters]);

  const emptyResults = React.useMemo(() => !count && !isFiltered, [count, isFiltered]);

  const { finished, assigned_to } = React.useMemo(() => filters as { finished?: boolean; assigned_to?: string }, [filters]);

  React.useEffect(() => setTitle(!!emptyResults), [setTitle, emptyResults]);

  const highlight = React.useMemo(
    () =>
      (data || [])
        .filter(({ meta, finished }) => !meta?.isRead && !finished)
        .map(({ id }) => id),
    [data]
  );

  const settings = React.useMemo(() => dataTableSettings({ t }), [t]);

  const dataGridOptions = React.useMemo(() => {
    const mergeProps = _.merge(settings, tableProps);
    return mergeProps;
  }, [settings, tableProps]);

  const calcSelectedFilters = React.useCallback((value: Record<string, unknown> = {}) => {
    const res: { name: string; value: unknown; label?: string }[] = [];
    if (value?.number) {
      res.push({ name: 'number', value: value.number, label: t('Number') });
    }
    if (value?.workflowCreatedBy) {
      res.push({
        name: 'workflowCreatedBy',
        value: value.workflowCreatedBy,
        label: t('Applicant')
      });
    }
    if (value?.workflowName) {
      res.push({ name: 'workflowName', value: value.workflowName, label: t('Workflow') });
    }
    if (value?.performer_username) {
      res.push({
        name: 'performer_username',
        value: value.performer_username,
        label: t('Performer')
      });
    }
    if (value?.withoutPerformerUsername) {
      res.push({ name: 'withoutPerformerUsername', value: t('NoPerformer') });
    }
    if (!!(value?.is_read as string)?.trim()) {
      const statusLabel = value.is_read == 'true' ? t('ReadTasks') : t('NotReadTasks');
      res.push({ name: 'is_read', value: statusLabel, label: t('Status') });
    }
    setSelectedFilters([...res]);
  }, []);

  const updateSelectedFilters = React.useCallback((newFilters: unknown[], filter: unknown) => {
    setDeletedFilter(filter);
    setSelectedFilters(newFilters);
  }, []);

  React.useEffect(() => {
    calcSelectedFilters(filters);
  }, []);

  if (count === null && !isFiltered) {
    return <BlockScreen dataGrid={true} />;
  }

  if (emptyResults) {
    const { title, description, Icon } = getTexts(t, finished, assigned_to);

    return <EmptyPage title={title} description={description} Icon={Icon} />;
  }

  return (
    <DataGrid
      {...({
        rows: data,
        columns: settings.columns,
        controls
      } as unknown as Record<string, unknown>)}
      highlight={highlight}
      loading={loading}
      onRowClick={handleItemClick}
      updateSelectedFilters={updateSelectedFilters}
      selectedFilters={selectedFilters as never}
      CustomToolbar={(toolbarProps: Record<string, unknown>) => (
        <div className={classes.customActions}>
          {TableToolbar && <TableToolbar {...toolbarProps} />}
          <TaskListSearch
            {...toolbarProps}
            calcSelectedFilters={calcSelectedFilters}
            selectedFilters={selectedFilters}
            deletedFilter={deletedFilter}
            setDeletedFilter={setDeletedFilter}
          />
        </div>
      )}
      {...(dataGridOptions as unknown as Record<string, unknown>)}
      showRowCount={true}
      localeText={{
        noRowsLabel: t('noData')
      }}
    />
  );
};

const translated = translate('TaskListPage')(TaskTable as never);

export default translated as unknown as React.ComponentType<Record<string, unknown>>; //dataTableConnect(translated);

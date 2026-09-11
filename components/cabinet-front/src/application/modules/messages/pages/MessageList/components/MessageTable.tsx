import React from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';

import DataGridRaw from 'components/DataGridPremium';
import EmptyPageRaw from 'components/EmptyPage';
import endPoint from 'application/endPoints/message';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import { ReactComponent as MessageIcon } from 'assets/img/emptyScreens/messages.svg';
import dataTableSettings from '../variables/dataTableSettings';
import controls from 'components/DataGridPremium/components/defaultProps';

const DataGrid = DataGridRaw as unknown as React.ComponentType<Record<string, unknown>>;
const EmptyPage = EmptyPageRaw as unknown as React.ComponentType<Record<string, unknown>>;

const filtersToExclude = ['from_created_at', 'to_created_at'];

interface MessageRow {
  id: string | number;
  isRead?: boolean;
  [key: string]: unknown;
}

interface MessageTableProps {
  t: (key: string) => string;
  data?: MessageRow[];
  loading?: boolean;
  actions: { load: () => void; [key: string]: unknown };
  handleItemClick?: (message: MessageRow) => void;
  count?: number;
  TableToolbar: React.ComponentType<Record<string, unknown>>;
  setTitle: (title: string) => void;
  filters: Record<string, unknown>;
}

const MessageTable = (props: MessageTableProps) => {
  const {
    t,
    data,
    loading,
    actions: { load },
    handleItemClick,
    count,
    TableToolbar,
    setTitle,
    filters
  } = props;
  const renderCount = React.useRef(0);

  const isFiltered = React.useMemo(() => {
    return filtersToExclude.find((filter) => {
      const isKey = filter in filters;
      return isKey && filters[filter];
    });
  }, [filters]);

  const emptyResults = React.useMemo(
    () => renderCount.current === 0 && count === 0 && !isFiltered,
    [renderCount, count, isFiltered]
  );

  React.useEffect(() => {
    if (count === 0) {
      renderCount.current++;
    }
  }, [count]);

  React.useEffect(() => {
    if (emptyResults) {
      setTitle('');
    }
  }, [setTitle, emptyResults]);

  if (emptyResults) {
    return (
      <EmptyPage
        title={t('EmptyListTitle')}
        description={t('EmptyListDescription')}
        Icon={MessageIcon}
      />
    );
  }

  const localeText = {
    noRowsLabel: t('noMessages')
  };

  const settings = dataTableSettings({ t, actions: { load } } as never) as { columns: unknown[] };

  const highlight = (data || []).filter(({ isRead }) => !isRead).map(({ id }) => id);

  return (
    <DataGrid
      rows={data}
      columns={settings.columns}
      controls={controls}
      localeText={localeText}
      highlight={highlight}
      loading={loading}
      onRowClick={handleItemClick}
      CustomToolbar={TableToolbar}
      startPage={endPoint?.startPage}
      {...(_.merge(settings, dataTableAdapter(props as never)) as unknown as Record<string, unknown>)}
    />
  );
};

const translated = translate('MessageListPage')(MessageTable as never);

export default dataTableConnect(endPoint)(translated as never);

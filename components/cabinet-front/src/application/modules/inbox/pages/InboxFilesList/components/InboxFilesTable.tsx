import React from 'react';
import { translate } from 'react-translate';

import FileDataTableRaw from 'components/FileDataTable';
import EmptyPageRaw from 'components/EmptyPage';
import endPoint from 'application/endPoints/inboxFiles';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import { ReactComponent as MessageIcon } from 'assets/img/emptyScreens/messages.svg';
import TableToolbarRaw from './TableToolbar';

const FileDataTable = FileDataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const EmptyPage = EmptyPageRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TableToolbar = TableToolbarRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface InboxItem {
  id: string;
  isRead?: boolean;
  documentId?: string;
  name?: string;
  [key: string]: unknown;
}

interface InboxFilesTableProps {
  t: (key: string) => string;
  data?: (InboxItem[] & { meta?: { total?: number } }) | InboxItem[];
  loading?: boolean;
  filters: { filtered?: unknown; search?: unknown };
  fileStorage?: Record<string, unknown>;
  handleItemClick: (item: InboxItem) => void;
  setTitle: (title: string) => void;
}

const InboxFilesTable = (props: InboxFilesTableProps) => {
  const { t, data, loading, filters, fileStorage, handleItemClick, setTitle } = props;

  const emptyResults =
    !loading && data && (data as { meta?: { total?: number } })?.meta?.total === 0 && !filters.filtered && !filters.search;

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

  const highlightedIds = ((data || []) as InboxItem[]).filter(({ isRead }) => !isRead).map(({ id }) => id);

  const tableSettings = dataTableAdapter(props as never) as { data: InboxItem[] | unknown; [key: string]: unknown };

  const tableData = Array.isArray(tableSettings.data)
    ? (tableSettings.data as InboxItem[]).map((item) => ({
        ...item,
        downloadToken: item.documentId,
        name: item.name + '.pdf'
      }))
    : tableSettings.data;

  return (
    <FileDataTable
      {...tableSettings}
      CustomToolbar={(tableProps: Record<string, unknown>) => <TableToolbar {...tableProps} t={t} />}
      loading={loading}
      pagination={true}
      fileStorage={fileStorage}
      onRowClick={handleItemClick}
      highlight={highlightedIds}
      data={tableData}
      withPrint={true}
    />
  );
};

const translated = translate('InboxFilesListPage')(InboxFilesTable as never);
export default dataTableConnect(endPoint)(translated as never);

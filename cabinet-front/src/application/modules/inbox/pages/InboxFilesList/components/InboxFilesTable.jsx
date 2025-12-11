import React from 'react';
import { translate } from 'react-translate';

import FileDataTable from 'components/FileDataTable';
import EmptyPage from 'components/EmptyPage';
import endPoint from 'application/endPoints/inboxFiles';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import { ReactComponent as MessageIcon } from 'assets/img/emptyScreens/messages.svg';
import TableToolbar from './TableToolbar';

const InboxFilesTable = (props) => {
  const { t, data, loading, filters, fileStorage, handleItemClick, setTitle } = props;

  const emptyResults =
    !loading && data && data?.meta?.total === 0 && !filters.filtered && !filters.search;

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

  const highlightedIds = (data || []).filter(({ isRead }) => !isRead).map(({ id }) => id);

  const tableSettings = dataTableAdapter(props);

  const tableData = Array.isArray(tableSettings.data)
    ? tableSettings.data.map((item) => ({
        ...item,
        downloadToken: item.documentId,
        name: item.name + '.pdf'
      }))
    : tableSettings.data;

  return (
    <FileDataTable
      {...tableSettings}
      CustomToolbar={(tableProps) => <TableToolbar {...tableProps} t={t} />}
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

const translated = translate('InboxFilesListPage')(InboxFilesTable);
export default dataTableConnect(endPoint)(translated);

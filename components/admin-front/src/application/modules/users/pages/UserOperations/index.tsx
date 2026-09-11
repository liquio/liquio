import React from 'react';
import { translate } from 'react-translate';

import DataTableRaw from 'components/DataTable';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import useTable from 'services/dataTable/useTable';

import endPoint from 'application/endPoints/userOperations';
import urlHashParams from 'helpers/urlHashParams';

import asModulePage from 'hooks/asModulePage';

import dataTableSettings from './dataTableSettings';
import { connect } from 'react-redux';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UserLoginJournalProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  title: string;
  location: unknown;
}

const UserLoginJournal = ({ t, title, location }: UserLoginJournalProps) => {
  const settings = dataTableSettings({ t });

  const tableData = useTable(endPoint, {
    filters: urlHashParams(),
    hiddenColumns: settings.hiddenColumns,
  });

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title)}
      loading={(tableData as unknown as { loading: boolean }).loading}
    >
      <DataTable {...settings} {...tableData} />
    </LeftSidebarLayout>
  );
};

const modulePage = asModulePage(UserLoginJournal as never);

const translated = translate('UserLoginJournal')(modulePage as never);

const mapStateToProps = ({ auth: { userUnits, info: userInfo } }: { auth: { userUnits: unknown[]; info: Record<string, unknown> } }) => ({
  userUnits,
  userInfo,
});

export default connect(mapStateToProps as never, null)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

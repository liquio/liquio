import React from 'react';
import { translate } from 'react-translate';

import DataTableRaw from 'components/DataTable';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import useTable from 'services/dataTable/useTable';

import endPoint from 'application/endPoints/accessHistory';
import urlHashParams from 'helpers/urlHashParams';
import asModulePage from 'hooks/asModulePage';

import dataTableSettings from './dataTableSettings';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UserAccessJournalPageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  title: string;
  location: unknown;
}

const UserAccessJournalPage = ({ t, title, location }: UserAccessJournalPageProps) => {
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
const modulePage = asModulePage(UserAccessJournalPage as never);
export default translate('UserAccessJournalPage')(modulePage as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

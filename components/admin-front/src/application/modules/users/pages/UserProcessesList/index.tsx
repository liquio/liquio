import React from 'react';
import { translate } from 'react-translate';

import DataTableRaw from 'components/DataTable';
import asModulePage from 'hooks/asModulePage';
import urlHashParams from 'helpers/urlHashParams';
import useTable from 'services/dataTable/useTable';
import LeftSidebarLayout from 'layouts/LeftSidebar';

import endPoint from 'endPoints/userProcesses';
import dataTableSettings from 'modules/users/pages/UserProcessesList/dataTableSettings';
import ExportReportRaw from 'modules/users/pages/UserProcessesList/components/ExportReport';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ExportReport = ExportReportRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UserProcessesListPageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  title: string;
  location: unknown;
}

const UserProcessesListPage = ({ t, title, location }: UserProcessesListPageProps) => {
  const tableSettings = {
    ...dataTableSettings({ t }),
    ...(useTable(endPoint, { filters: urlHashParams() }) as unknown as Record<string, unknown>),
  };

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title)}
      loading={(tableSettings as unknown as { loading?: boolean }).loading}
    >
      <DataTable
        CustomToolbar={() => <ExportReport {...tableSettings} />}
        {...tableSettings}
      />
    </LeftSidebarLayout>
  );
};

const modulePage = asModulePage(UserProcessesListPage as never);
export default translate('UserProcessesListPage')(modulePage as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

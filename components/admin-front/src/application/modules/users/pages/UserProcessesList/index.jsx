import React from 'react';
import { translate } from 'react-translate';

import DataTable from 'components/DataTable';
import asModulePage from 'hooks/asModulePage';
import urlHashParams from 'helpers/urlHashParams';
import useTable from 'services/dataTable/useTable';
import LeftSidebarLayout from 'layouts/LeftSidebar';

import endPoint from 'endPoints/userProcesses';
import dataTableSettings from 'modules/users/pages/UserProcessesList/dataTableSettings';
import ExportReport from 'modules/users/pages/UserProcessesList/components/ExportReport';

const UserProcessesListPage = ({ t, title, location }) => {
  const tableSettings = {
    ...dataTableSettings({ t }),
    ...useTable(endPoint, { filters: urlHashParams() }),
  };

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title)}
      loading={tableSettings.loading}
    >
      <DataTable
        CustomToolbar={() => <ExportReport {...tableSettings} />}
        {...tableSettings}
      />
    </LeftSidebarLayout>
  );
};

const modulePage = asModulePage(UserProcessesListPage);
export default translate('UserProcessesListPage')(modulePage);

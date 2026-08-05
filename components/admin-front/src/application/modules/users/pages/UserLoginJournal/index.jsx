import React from 'react';
import { translate } from 'react-translate';

import DataTable from 'components/DataTable';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import useTable from 'services/dataTable/useTable';

import endPoint from 'application/endPoints/loginHistory';
import urlHashParams from 'helpers/urlHashParams';

import asModulePage from 'hooks/asModulePage';

import dataTableSettings from './dataTableSettings';

const UserLoginJournal = ({ t, title, location }) => {
  const settings = dataTableSettings({ t });

  const tableData = useTable(endPoint, {
    filters: urlHashParams(),
    hiddenColumns: settings.hiddenColumns,
  });

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title)}
      loading={tableData.loading}
    >
      <DataTable {...settings} {...tableData} />
    </LeftSidebarLayout>
  );
};

const modulePage = asModulePage(UserLoginJournal);
export default translate('UserLoginJournal')(modulePage);

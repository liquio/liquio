import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';

import DataTable from 'components/DataTable';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import useTable from 'services/dataTable/useTable';

import urlHashParams from 'helpers/urlHashParams';
import checkAccess from 'helpers/checkAccess';
import asModulePage from 'hooks/asModulePage';

import dataTableSettings from 'modules/workflow/pages/WorkflowProcesses/dataTableSettings';

const endPoint = {
  dataURL: 'workflow-processes/tasks',
  sourceName: 'workflowProcesses',
  searchFilterField: 'search',
  autoLoad: true,
};

const WorkflowProcessesPage = ({ t, title, location, userUnits, userInfo }) => {
  const settings = dataTableSettings({ t, userUnits, userInfo });
  const filters = urlHashParams();

  if (filters.userIds) {
    filters.userIds = [].concat(filters.userIds);
  }

  const hasAccess = checkAccess(
    { userHasUnit: [1000001, 1000000041] },
    userInfo,
    userUnits,
  );

  if (!hasAccess) {
    delete settings.filterHandlers.userIdList;
  }

  const tableData = useTable(endPoint, {
    filters,
    hiddenColumns: settings.hiddenColumns,
  });

  return (
    <LeftSidebarLayout
      title={t(title)}
      location={location}
      loading={tableData.loading}
    >
      <DataTable {...settings} {...tableData} />
    </LeftSidebarLayout>
  );
};

const modulePage = asModulePage(WorkflowProcessesPage);

const translated = translate('WorkflowProcesses')(modulePage);

const mapStateToProps = ({ auth: { userUnits, info: userInfo } }) => ({
  userUnits,
  userInfo,
});

export default connect(mapStateToProps, null)(translated);

import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';

import DataTableRaw from 'components/DataTable';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import useTable from 'services/dataTable/useTable';
import type { DataTableEndpoint } from 'services/dataTable/types';

import urlHashParams from 'helpers/urlHashParams';
import checkAccess from 'helpers/checkAccess';
import asModulePage from 'hooks/asModulePage';

import dataTableSettings from 'modules/workflow/pages/WorkflowProcesses/dataTableSettings';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

const endPoint: DataTableEndpoint = {
  dataURL: 'workflow-processes/tasks',
  sourceName: 'workflowProcesses',
  searchFilterField: 'search',
  autoLoad: true,
};

interface UserInfo {
  [key: string]: unknown;
}

interface Unit {
  id: number;
  [key: string]: unknown;
}

interface WorkflowProcessesPageProps {
  t: (key: string) => string;
  title: string;
  location: unknown;
  userUnits: Unit[];
  userInfo: UserInfo;
}

const WorkflowProcessesPage = ({ t, title, location, userUnits, userInfo }: WorkflowProcessesPageProps) => {
  const settings = dataTableSettings({ t, userUnits, userInfo } as never) as {
    filterHandlers: Record<string, unknown>;
    hiddenColumns?: string[];
    [key: string]: unknown;
  };
  const filters = urlHashParams() as { userIds?: unknown };

  if (filters.userIds) {
    filters.userIds = ([] as unknown[]).concat(filters.userIds);
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
  } as never);

  return (
    <LeftSidebarLayout
      title={t(title)}
      location={location}
      loading={(tableData as { loading?: boolean }).loading}
    >
      <DataTable {...settings} {...tableData} />
    </LeftSidebarLayout>
  );
};

const modulePage = asModulePage(WorkflowProcessesPage as never);

const translated = translate('WorkflowProcesses')(modulePage as never);

interface ConnectedState {
  auth: { userUnits: Unit[]; info: UserInfo };
}

const mapStateToProps = ({ auth: { userUnits, info: userInfo } }: ConnectedState) => ({
  userUnits,
  userInfo,
});

export default connect(mapStateToProps, null)(translated as never);

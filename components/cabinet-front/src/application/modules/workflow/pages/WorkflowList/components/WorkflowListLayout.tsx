import React from 'react';

import LeftSidebarLayoutRaw, { Content } from 'layouts/LeftSidebar';
import WorkflowTableRaw from 'modules/workflow/pages/WorkflowList/components/WorkflowTable';
import type { DataTableEndpoint } from 'services/dataTable/types';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const WorkflowTable = WorkflowTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface WorkflowListLayoutProps {
  templates?: unknown[] | null;
  endPoint: DataTableEndpoint;
  TableToolbar?: React.ComponentType<Record<string, unknown>> | null;
  checkable?: boolean;
  handleItemClick?: (row: unknown) => void;
  location: unknown;
  title?: string | null;
  loading?: boolean;
}

const WorkflowListLayout = (props: WorkflowListLayoutProps) => {
  const {
    TableToolbar = null,
    endPoint,
    checkable = false,
    handleItemClick = () => null,
    location,
    title: titleOrigin = null,
    loading = false
  } = props;
  const [title, setTitle] = React.useState(titleOrigin);

  const updateTitle = React.useCallback(
    (del: boolean) => {
      if (!del) {
        setTitle(titleOrigin);
      } else {
        setTitle('');
      }
    },
    [setTitle, titleOrigin]
  );

  return (
    <LeftSidebarLayout location={location} title={title} loading={loading}>
      <Content>
        <WorkflowTable
          endPoint={endPoint}
          TableToolbar={TableToolbar}
          checkable={checkable}
          handleItemClick={handleItemClick}
          setTitle={updateTitle}
        />
      </Content>
    </LeftSidebarLayout>
  );
};

export default WorkflowListLayout;

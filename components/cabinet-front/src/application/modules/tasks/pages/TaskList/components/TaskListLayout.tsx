import React, { Suspense } from 'react';
import { translate } from 'react-translate';

import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import BlockScreenRaw from 'components/BlockScreenReforged';

const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;

const TaskTable = React.lazy(() => import('modules/tasks/pages/TaskList/components/TaskTable'));
const TableToolbar = React.lazy(() => import('./TableToolbar/index'));

interface TaskListLayoutProps {
  endPoint: Record<string, unknown>;
  handleItemClick?: (row: unknown) => void;
  title?: string | null;
  loading?: boolean;
  location: unknown;
  tableProps: Record<string, unknown>;
}

const TaskListLayout = ({
  endPoint,
  handleItemClick = () => null,
  title: titleOrigin,
  loading = false,
  location,
  tableProps
}: TaskListLayoutProps) => {
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
        <Suspense fallback={<BlockScreen dataGrid={true} />}>
          <TaskTable
            endPoint={endPoint}
            TableToolbar={TableToolbar}
            handleItemClick={handleItemClick}
            setTitle={updateTitle}
            tableProps={tableProps}
          />
        </Suspense>
      </Content>
    </LeftSidebarLayout>
  );
};

export default translate('TaskListPage')(TaskListLayout as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';

import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import BlockScreen from 'components/BlockScreenReforged';

const TaskTable = React.lazy(() => import('modules/tasks/pages/TaskList/components/TaskTable'));
const TableToolbar = React.lazy(() => import('./TableToolbar/index'));

const TaskListLayout = ({
  endPoint,
  handleItemClick,
  title: titleOrigin,
  loading,
  location,
  tableProps
}) => {
  const [title, setTitle] = React.useState(titleOrigin);

  const updateTitle = React.useCallback(
    (del) => {
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

TaskListLayout.propTypes = {
  templates: PropTypes.array,
  endPoint: PropTypes.object.isRequired,
  TableToolbar: PropTypes.instanceOf(React.Component),
  checkable: PropTypes.bool,
  location: PropTypes.object.isRequired,
  title: PropTypes.string,
  loading: PropTypes.bool,
  handleItemClick: PropTypes.func
};

TaskListLayout.defaultProps = {
  templates: null,
  TableToolbar: null,
  checkable: false,
  title: null,
  loading: false,
  handleItemClick: () => null
};

export default translate('TaskListPage')(TaskListLayout);

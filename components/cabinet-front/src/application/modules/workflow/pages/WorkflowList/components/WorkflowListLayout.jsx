import React from 'react';
import PropTypes from 'prop-types';

import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import WorkflowTable from 'modules/workflow/pages/WorkflowList/components/WorkflowTable';

const WorkflowListLayout = (props) => {
  const {
    TableToolbar,
    endPoint,
    checkable,
    handleItemClick,
    location,
    title: titleOrigin,
    loading
  } = props;
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

WorkflowListLayout.propTypes = {
  templates: PropTypes.array,
  endPoint: PropTypes.object.isRequired,
  TableToolbar: PropTypes.instanceOf(React.Component),
  checkable: PropTypes.bool,
  location: PropTypes.object.isRequired,
  title: PropTypes.string,
  loading: PropTypes.bool,
  handleItemClick: PropTypes.func
};

WorkflowListLayout.defaultProps = {
  templates: null,
  TableToolbar: null,
  checkable: false,
  title: null,
  loading: false,
  handleItemClick: () => null
};

export default WorkflowListLayout;

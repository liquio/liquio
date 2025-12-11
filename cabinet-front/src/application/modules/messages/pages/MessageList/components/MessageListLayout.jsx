import React, { Suspense } from 'react';
import PropTypes from 'prop-types';

import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import BlockScreen from 'components/BlockScreenReforged';

const TableToolbar = React.lazy(() => import('./TableToolbar/index'));
const MessageTable = React.lazy(() => import('./MessageTable'));

const MessageListLayout = ({ location, title: titleOrigin, loading, handleItemClick }) => {
  const [title, setTitle] = React.useState(titleOrigin);

  return (
    <LeftSidebarLayout location={location} title={title} loading={loading}>
      <Content>
        <Suspense fallback={<BlockScreen dataGrid={true} />}>
          <MessageTable
            handleItemClick={handleItemClick}
            TableToolbar={TableToolbar}
            setTitle={setTitle}
          />
        </Suspense>
      </Content>
    </LeftSidebarLayout>
  );
};

MessageListLayout.propTypes = {
  data: PropTypes.array,
  location: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  handleItemClick: PropTypes.func
};

MessageListLayout.defaultProps = {
  data: null,
  loading: false,
  handleItemClick: () => null
};

export default MessageListLayout;

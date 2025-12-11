import React, { Suspense } from 'react';
import PropTypes from 'prop-types';

import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import Preloader from 'components/Preloader';
import BlockScreen from 'components/BlockScreenReforged';

const InboxFilesTable = React.lazy(() =>
  import('modules/inbox/pages/InboxFilesList/components/InboxFilesTable')
);

const InboxFileListLayout = ({
  location,
  title: titleOrigin,
  loading,
  data,
  fileStorage,
  handleItemClick
}) => {
  const [title, setTitle] = React.useState(titleOrigin);

  return (
    <LeftSidebarLayout location={location} title={title} loading={loading}>
      <Content>
        <Suspense fallback={<BlockScreen dataGrid={true} />}>
          {data ? (
            <InboxFilesTable
              fileStorage={fileStorage}
              handleItemClick={handleItemClick}
              setTitle={setTitle}
            />
          ) : (
            <Preloader />
          )}
        </Suspense>
      </Content>
    </LeftSidebarLayout>
  );
};

InboxFileListLayout.propTypes = {
  location: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  data: PropTypes.array,
  fileStorage: PropTypes.object,
  handleItemClick: PropTypes.func
};

InboxFileListLayout.defaultProps = {
  loading: false,
  data: null,
  fileStorage: {},
  handleItemClick: () => null
};

export default InboxFileListLayout;

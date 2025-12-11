import React, { Suspense } from 'react';
import PropTypes from 'prop-types';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import BlockScreen from 'components/BlockScreenReforged';

const InboxFileDetails = React.lazy(() =>
  import('modules/inbox/pages/InboxFiles/components/InboxFileDetails')
);

const InboxFileLayout = ({ t, location, title, loading, inboxFile }) => (
  <LeftSidebarLayout
    location={location}
    title={title}
    loading={loading}
    breadcrumbs={[
      {
        label: t('InboxFilesTitle'),
        link: '/workflow/inbox'
      },
      {
        label: title
      }
    ]}
  >
    <Suspense fallback={<BlockScreen dataGrid={true} />}>
      <InboxFileDetails {...inboxFile} />
    </Suspense>
  </LeftSidebarLayout>
);

InboxFileLayout.propTypes = {
  location: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  inboxFile: PropTypes.object
};

InboxFileLayout.defaultProps = {
  loading: false,
  inboxFile: null
};

export default InboxFileLayout;

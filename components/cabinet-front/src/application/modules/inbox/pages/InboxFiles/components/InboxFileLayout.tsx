import React, { Suspense } from 'react';

import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import BlockScreenRaw from 'components/BlockScreenReforged';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;

const InboxFileDetails = React.lazy(() =>
  import('modules/inbox/pages/InboxFiles/components/InboxFileDetails')
);

interface InboxFile {
  [key: string]: unknown;
}

interface InboxFileLayoutProps {
  t: (key: string) => string;
  location: unknown;
  title: string;
  loading?: boolean;
  inboxFile?: InboxFile | null;
}

const InboxFileLayout = ({ t, location, title, loading = false, inboxFile = null }: InboxFileLayoutProps) => (
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
      <InboxFileDetails {...(inboxFile as Record<string, unknown>)} />
    </Suspense>
  </LeftSidebarLayout>
);

export default InboxFileLayout;

import React, { Suspense } from 'react';

import LeftSidebarLayoutRaw, { Content } from 'layouts/LeftSidebar';
import PreloaderRaw from 'components/Preloader';
import BlockScreenRaw from 'components/BlockScreenReforged';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;

const InboxFilesTable = React.lazy(() =>
  import('modules/inbox/pages/InboxFilesList/components/InboxFilesTable')
);

interface InboxFileListLayoutProps {
  location: unknown;
  title: string;
  loading?: boolean;
  data?: unknown[] | null;
  fileStorage?: Record<string, unknown>;
  handleItemClick?: (item: unknown) => void;
}

const InboxFileListLayout = ({
  location,
  title: titleOrigin,
  loading = false,
  data = null,
  fileStorage = {},
  handleItemClick = () => null
}: InboxFileListLayoutProps) => {
  const [title, setTitle] = React.useState(titleOrigin);

  return (
    <LeftSidebarLayout location={location} title={title} loading={loading}>
      <Content>
        <Suspense fallback={<BlockScreen dataGrid={true} />}>
          {data ? (
            <InboxFilesTable
              {...({
                fileStorage,
                handleItemClick,
                setTitle
              } as unknown as Record<string, unknown>)}
            />
          ) : (
            <Preloader />
          )}
        </Suspense>
      </Content>
    </LeftSidebarLayout>
  );
};

export default InboxFileListLayout;

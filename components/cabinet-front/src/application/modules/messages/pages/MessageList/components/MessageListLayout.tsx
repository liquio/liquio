import React, { Suspense } from 'react';

import LeftSidebarLayoutRaw, { Content } from 'layouts/LeftSidebar';
import BlockScreenRaw from 'components/BlockScreenReforged';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;

const TableToolbar = React.lazy(() => import('./TableToolbar/index'));
const MessageTable = React.lazy(() => import('./MessageTable'));

interface MessageListLayoutProps {
  location: unknown;
  title: string;
  loading?: boolean;
  handleItemClick?: (message: unknown) => void;
}

const MessageListLayout = ({ location, title: titleOrigin, loading = false, handleItemClick = () => null }: MessageListLayoutProps) => {
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

export default MessageListLayout;

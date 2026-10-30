import React from 'react';

import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface LayoutProps {
  children?: React.ReactNode;
  location?: unknown;
  title?: string;
  loading?: boolean;
}

const Layout = ({ children = null, location = null, title = '', loading = false }: LayoutProps) => {
  return (
    <LeftSidebarLayout location={location} title={title} loading={loading}>
      {children}
    </LeftSidebarLayout>
  );
};

export default Layout;

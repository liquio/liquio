import React from 'react';
import { translate } from 'react-translate';

import ErrorScreenRaw from 'components/ErrorScreen';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';

const ErrorScreen = ErrorScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;
const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface PageNotFoundProps {
  t: (key: string) => string;
  location: unknown;
}

const PageNotFound = ({ t, location }: PageNotFoundProps) => (
  <LeftSidebarLayout location={location}>
    <ErrorScreen error={new Error(t('PageNotFound'))} />
  </LeftSidebarLayout>
);

export default translate('App')(PageNotFound as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

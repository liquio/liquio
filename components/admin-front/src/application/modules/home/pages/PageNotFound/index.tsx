import React from 'react';
import { translate } from 'react-translate';

import ErrorScreen from 'components/ErrorScreen';
import LeftSidebarLayout from 'layouts/LeftSidebar';

interface PageNotFoundProps {
  t: (key: string) => string;
  location: unknown;
}

const PageNotFound = ({ t, location }: PageNotFoundProps) => (
  <LeftSidebarLayout location={location} title={t('PageNotFound')}>
    <ErrorScreen darkTheme={true} error={new Error(t('PageNotFound'))} />
  </LeftSidebarLayout>
);

export default translate('App')(PageNotFound as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

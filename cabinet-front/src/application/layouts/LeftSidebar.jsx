import React from 'react';
import { connect } from 'react-redux';

import Layout from 'core/layouts/LeftSidebar';
import BlockScreen from 'components/BlockScreen';
import { getConfig } from '../../core/helpers/configLoader';

const LeftSidebarLayout = ({ uiFilters, ...props }) => {
  const config = getConfig();

  if (!uiFilters && config.useUIFilters) {
    return <BlockScreen open={true} transparentBackground={true} />;
  }

  return <Layout {...props} />;
};

const mapState = ({ app: { uiFilters } }) => ({ uiFilters });

export { default as Content } from 'layouts/components/Content';
export { default as DrawerContent } from 'layouts/components/DrawerContent';

export default connect(mapState)(LeftSidebarLayout);

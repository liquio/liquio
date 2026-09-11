import React from 'react';
import PropTypes from 'prop-types';

import LeftSidebarLayout from 'layouts/LeftSidebar';

const Layout = ({ children, location, title, loading }) => {
  return (
    <LeftSidebarLayout location={location} title={title} loading={loading}>
      {children}
    </LeftSidebarLayout>
  );
};

Layout.propTypes = {
  children: PropTypes.node,
  location: PropTypes.object,
  title: PropTypes.string,
  loading: PropTypes.bool
};

Layout.defaultProps = {
  children: null,
  location: null,
  title: '',
  loading: false
};

export default Layout;

import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';

import ErrorScreen from 'components/ErrorScreen';
import LeftSidebarLayout from 'layouts/LeftSidebar';

const PageNotFound = ({ t, location }) => (
  <LeftSidebarLayout location={location} title={t('PageNotFound')}>
    <ErrorScreen darkTheme={true} error={new Error(t('PageNotFound'))} />
  </LeftSidebarLayout>
);

PageNotFound.propTypes = {
  t: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired
};

PageNotFound.defaultProps = {};

export default translate('App')(PageNotFound);

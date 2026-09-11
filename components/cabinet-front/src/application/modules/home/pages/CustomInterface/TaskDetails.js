import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@mui/material';

import renderHTML from 'helpers/renderHTML';

const Layout = ({ details }) => (
  <>
    {details?.title ? <Typography variant="h5">{details.title}</Typography> : null}
    {details?.subtitle ? (
      <Typography variant="body1">{renderHTML(details.subtitle)}</Typography>
    ) : null}
  </>
);

Layout.propTypes = {
  details: PropTypes.shape({
    title: PropTypes.string,
    subtitle: PropTypes.string
  })
};

Layout.defaultProps = {
  details: null
};

export default Layout;

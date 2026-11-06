import React from 'react';
import { Typography } from '@mui/material';

import renderHTML from 'helpers/renderHTML';

interface TaskDetailsProps {
  details?: {
    title?: string;
    subtitle?: string;
  } | null;
}

const Layout = ({ details = null }: TaskDetailsProps) => (
  <>
    {details?.title ? <Typography variant="h5">{details.title}</Typography> : null}
    {details?.subtitle ? (
      <Typography variant="body1">{renderHTML(details.subtitle)}</Typography>
    ) : null}
  </>
);

export default Layout;

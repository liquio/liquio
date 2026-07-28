import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { getBreadcrumbs } from '../helpers/navigation';

const FileLibraryBreadcrumbs = ({ t, folderStack }) => (
  <Breadcrumbs sx={{ px: 2, pt: 2, pb: 1 }}>
    {getBreadcrumbs(folderStack).map((item, index) => {
      const label = item.id === 'root' ? t('Root') : item.name;
      const active = index === folderStack.length;

      if (active) {
        return (
          <Typography key={item.id} color="text.primary">
            {label}
          </Typography>
        );
      }

      return (
        <Link key={item.id} component={RouterLink} to={item.path} color="primary" underline="hover">
          {label}
        </Link>
      );
    })}
  </Breadcrumbs>
);

export default FileLibraryBreadcrumbs;

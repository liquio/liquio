import React from 'react';
import { translate } from 'react-translate';
import { Typography } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import Layout from 'layouts/LeftSidebar';

const styles = {
  title: {
    padding: '0 12px',
    color: '#00224e',
    marginTop: 15,
  },
};

interface NoPermissionProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  location?: unknown;
}

const NoPermission = ({ t, classes, location }: NoPermissionProps) => (
  <Layout location={location} title={t('NoPermissionTitle')}>
    <Typography
      className={classes.title}
      variant="h4"
      gutterBottom={true}
      id="no-permission"
    >
      {t('NoPermission')}
    </Typography>
  </Layout>
);

const translated = translate('App')(NoPermission as never);
export default withStyles(styles)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;

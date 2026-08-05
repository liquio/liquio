import React from 'react';
import { translate } from 'react-translate';
import { Grid, AppBar, Toolbar, Typography } from '@mui/material';

import ProgressLine from 'components/Preloader/ProgressLine';

const Header = ({ t, loading }) => (
  <>
    <AppBar color="light" position="sticky" elevation={0}>
      <Toolbar>
        <Grid container={true} alignItems="center">
          <Grid item={true} xs={true}>
            <Typography color="inherit" variant="h5">
              {t('Header')}
            </Typography>
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
    <ProgressLine loading={loading} />
  </>
);

export default translate('TaskListPage')(Header);

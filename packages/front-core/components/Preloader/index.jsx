import React from 'react';
import withStyles from '@mui/styles/withStyles';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import classNames from 'classnames';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100% - 200px)',
    width: '100%',
  },
  box: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    '&>span': {
      overflow: 'hidden',
    },
  },
};

const Preloader = ({ classes }) => (
  <div
    className={classNames({
      [classes.container]: true,
    })}
  >
    <Box
      className={classNames({
        [classes.box]: true,
      })}
    >
      <CircularProgress />
    </Box>
  </div>
);

export { default as PreloaderModal } from 'components/Preloader/PreloaderModal';
export default withStyles(styles)(Preloader);

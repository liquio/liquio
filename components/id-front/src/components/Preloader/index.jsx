import React from 'react';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import setId from 'helpers/setComponentsId';

const styles = {
  '@keyframes rotate': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  mainWrapper: {
    textAlign: 'center',
    padding: '20px 20px 10px',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    padding: '20px 20px 10px',
    height: '100%',
  },
  nopadding: {
    padding: 10,
  },
  box: {
    position: 'relative',
    width: '136px',
    height: '136px',
    borderRadius: '30%',
    overflow: 'hidden',
    margin: '0 auto',
  },
  content: {
    background: '#fff',
    position: 'absolute',
    top: '2px',
    bottom: '2px',
    left: '2px',
    right: '2px',
    margin: 'auto',
    borderRadius: '30%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '6',
  },
  blackUnderlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    margin: 'auto',
    background: '#000',
    borderRadius: '30%',
    overflow: 'hidden',
    zIndex: 4,
  },
  rotator: {
    display: 'block',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: 'auto',
    borderRadius: '50%',
    animationName: 'rotate',
    animationDuration: '2s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  border: {
    position: 'absolute',
    width: '75px',
    height: '75px',
    top: '-28px',
    left: 0,
    right: 0,
    margin: 'auto',
    borderRadius: '50%',
    background: 'linear-gradient(90deg, #8edacb 0, #7abace 100%)',
    zIndex: 5,
  },
  containerDef: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100% - 200px)',
    width: '100%',
  },
  boxDef: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

const DefaultLoader = withStyles(styles)(({ classes }) => (
  <div
    className={classNames({
      [classes.containerDef]: true,
    })}
  >
    <Box
      className={classNames({
        [classes.boxDef]: true,
      })}
    >
      <CircularProgress />
    </Box>
  </div>
));

const Preloader = ({ classes }) => (
  <div className={classes.mainWrapper} id={setId('preloader-wrap')('')}>
    <DefaultLoader />
  </div>
);

export default withStyles(styles)(Preloader);

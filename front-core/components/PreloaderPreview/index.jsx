import React from 'react';
import PropTypes from 'prop-types';

import withStyles from '@mui/styles/withStyles';
import Preloader from 'components/Preloader';

const styles = {};

const PreloaderPreview = ({ classes }) => (
  <div className={classes.previewWrap}>
    <div className={classes.previewScrollBox}>
      <div className={classes.previewBox}>
        <div className={classes.previewFrame}>
          <Preloader />
        </div>
      </div>
    </div>
    <div className={classes.previewActions} />
  </div>
);

PreloaderPreview.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(PreloaderPreview);

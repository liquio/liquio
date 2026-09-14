import React from 'react';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import Preloader from 'components/Preloader';

// This styles object is empty (as in the original), so MUI injects an empty `classes`;
// every className below is always undefined at runtime. Preserved as-is.
const styles = {};

const PreloaderPreview = ({ classes }: WithStyles<typeof styles>) => {
  const c = classes as Record<string, string | undefined>;
  return (
    <div className={c.previewWrap}>
      <div className={c.previewScrollBox}>
        <div className={c.previewBox}>
          <div className={c.previewFrame}>
            <Preloader />
          </div>
        </div>
      </div>
      <div className={c.previewActions} />
    </div>
  );
};

export default withStyles(styles)(PreloaderPreview);

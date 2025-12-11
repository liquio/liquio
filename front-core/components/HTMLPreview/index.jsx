import React from 'react';
import PropTypes from 'prop-types';
import { Icon, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = {};

const HTMLPreview = ({
  file,
  url,
  fileName,
  classes,
  handleDownload
}) => {
  const src = url || URL.createObjectURL(file);
  return (
    <div className={classes.htmlWrap}>
      <div className={classes.htmlScrollBox}>
        <div className={classes.htmlBox}>
          <iframe title={fileName} src={src} className={classes.htmlFrame} />
        </div>
      </div>
      <div className={classes.htmlActions}>
        <Button color="yellow" onClick={handleDownload}>
          <Icon>save_alt</Icon>
        </Button>
      </div>
    </div>
  );
};

HTMLPreview.propTypes = {
  classes: PropTypes.object.isRequired,
  fileName: PropTypes.string,
  handleDownload: PropTypes.func,
  file: PropTypes.object.isRequired,
  url: PropTypes.string
};

HTMLPreview.defaultProps = {
  handleDownload: undefined,
  fileName: 'document',
  url: ''
};

// decorate and export
export default withStyles(styles)(HTMLPreview);

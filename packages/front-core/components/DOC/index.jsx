import React from 'react';
import PropTypes from 'prop-types';
import { Icon, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import setComponentsId from 'helpers/setComponentsId';

const DOCPreview = ({ fileName, setId, docUrl, classes, handleDownload }) => (
  <div id={setId('wrap')}>
    <iframe
      src={`https://docs.google.com/viewer?url=${docUrl}&embedded=true&a=bi`}
      frameBorder={0}
      title={fileName}
    />
    <Button
      color="yellow"
      className={classes.pdfDownload}
      onClick={handleDownload}
      setId={(elementName) => setId(`download-${elementName}`)}
    >
      <Icon>save_alt</Icon>
    </Button>
  </div>
);

DOCPreview.propTypes = {
  classes: PropTypes.object.isRequired,
  docUrl: PropTypes.string,
  setId: PropTypes.func,
  handleDownload: PropTypes.func,
  fileName: PropTypes.string
};

DOCPreview.defaultProps = {
  setId: setComponentsId('img-preview'),
  docUrl: '',
  handleDownload: undefined,
  fileName: 'document'
};

export default withStyles({})(DOCPreview);

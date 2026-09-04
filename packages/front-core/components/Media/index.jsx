import React from 'react';
import PropTypes from 'prop-types';

import { translate } from 'react-translate';
import setComponentsId from 'helpers/setComponentsId';

import { Icon, Button } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

// import pdfDocumentStyles from 'variables/styles/pdfDocument';
// import customInputStyle from 'variables/styles/customInputStyle';
// import attachStyles from 'variables/styles/attaches';

const styles = {};

const Media = ({ setId, classes, handleDownload, format, name, url }) => (
  <div id={setId('wrap')} className={classes.mediaBox}>
    {format === 'video' && (
      <video autoPlay={false} className={classes.videoFrame} controls={true}>
        <source src={url} />
        <track label={name} kind="captions" />
      </video>
    )}
    {format === 'audio' && (
      <audio autoPlay={false} controls={true}>
        <source src={url} />
        <track label={name} kind="captions" />
      </audio>
    )}
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

const styled = withStyles(styles)(Media);
const translated = translate('ClaimList')(styled);

Media.propTypes = {
  classes: PropTypes.object.isRequired,
  setId: PropTypes.func,
  handleDownload: PropTypes.func,
  format: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};

Media.defaultProps = {
  setId: setComponentsId('img-preview'),
  handleDownload: undefined,
};

// decorate and export
export default translated;

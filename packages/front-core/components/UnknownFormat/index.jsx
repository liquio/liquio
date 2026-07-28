import React from 'react';
import PropTypes from 'prop-types';

import { translate } from 'react-translate';
import setComponentsId from 'helpers/setComponentsId';
import cx from 'classnames';

import { Icon, Button, Typography } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

// import pdfDocumentStyles from 'variables/styles/pdfDocument';
// import customInputStyle from 'variables/styles/customInputStyle';

const styles = {};

const UnknownFormat = ({ setId, t, classes, handleDownload, itIsBinary }) => (
  <div id={setId('wrap')}>
    <Typography
      variant="h6"
      component="h4"
      className={classes.cardTitle}
      id={setId('error')}
    >
      {t('UNKNOWN_FORMAT')}
    </Typography>
    <Typography
      variant="h6"
      component="h4"
      className={cx(classes.cardTitle, classes.error)}
      id={setId('download-only')}
    >
      {itIsBinary ? t('DOWNLOAD_ONLY') : t('NOT_SUPPORTED')}
    </Typography>
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

const styled = withStyles(styles)(UnknownFormat);
const translated = translate('ClaimList')(styled);

UnknownFormat.propTypes = {
  classes: PropTypes.object.isRequired,
  setId: PropTypes.func,
  handleDownload: PropTypes.func,
  t: PropTypes.func.isRequired,
  itIsBinary: PropTypes.bool.isRequired,
};

UnknownFormat.defaultProps = {
  setId: setComponentsId('img-preview'),
  handleDownload: undefined,
};

// decorate and export
export default translated;

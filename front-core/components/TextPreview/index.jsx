import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
// import setComponentsId from 'helpers/setComponentsId';

import { Typography } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

// import pdfStyles from 'variables/styles/pdfDocument';
// import attachStyles from 'variables/styles/attaches';

const styles = {};

const getText = (text, t) => {
  if (text === '404 File not found') {
    return t('404');
  }
  if (text === "Can't find document or user don't have needed access.") {
    return t('NEED_ACCESS');
  }
  return text;
};

const TextPreview = ({ text, classes, t }) => (
  <div className={classes.htmlWrap}>
    <div className={classes.htmlScrollBox}>
      <div className={classes.htmlBox}>
        <div className={classes.htmlFrame}>
          <Typography variant="h6" className={classes.htmlText}>
            {getText(text, t)}
          </Typography>
        </div>
      </div>
    </div>
  </div>
);

TextPreview.propTypes = {
  classes: PropTypes.object.isRequired,
  text: PropTypes.string,
  t: PropTypes.func.isRequired,
};

TextPreview.defaultProps = {
  text: '',
};

// decorate and export
export default translate('Attach')(withStyles(styles)(TextPreview));

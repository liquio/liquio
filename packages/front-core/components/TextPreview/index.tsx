import React from 'react';
import { translate, Translate } from 'react-translate';

import { Typography } from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';

// This styles object is empty (as in the original), so MUI injects an empty `classes`;
// every className below is always undefined at runtime. Preserved as-is.
const styles = {};

const getText = (text: string, t: Translate): string => {
  if (text === '404 File not found') {
    return t('404');
  }
  if (text === "Can't find document or user don't have needed access.") {
    return t('NEED_ACCESS');
  }
  return text;
};

interface TextPreviewProps extends WithStyles<typeof styles> {
  text?: string;
  t: Translate;
}

const TextPreview = ({ text = '', classes, t }: TextPreviewProps) => {
  const c = classes as Record<string, string | undefined>;
  return (
    <div className={c.htmlWrap}>
      <div className={c.htmlScrollBox}>
        <div className={c.htmlBox}>
          <div className={c.htmlFrame}>
            <Typography variant="h6" className={c.htmlText}>
              {getText(text, t)}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};

export default translate('Attach')(withStyles(styles)(TextPreview));

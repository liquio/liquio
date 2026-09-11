import React from 'react';

import { translate, Translate } from 'react-translate';
import setComponentsId from 'helpers/setComponentsId';
import cx from 'classnames';

import { Icon, Button, Typography } from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';

// This styles object is empty (as in the original), so MUI injects an empty `classes`;
// every className below is always undefined at runtime. Preserved as-is.
const styles = {};

interface UnknownFormatProps extends WithStyles<typeof styles> {
  setId?: (element: string) => string;
  t: Translate;
  handleDownload?: () => void;
  itIsBinary: boolean;
}

const UnknownFormat = ({ setId = setComponentsId('img-preview'), t, classes, handleDownload, itIsBinary }: UnknownFormatProps) => {
  const c = classes as Record<string, string | undefined>;
  return (
    <div id={setId('wrap')}>
      <Typography variant="h6" component="h4" className={c.cardTitle} id={setId('error')}>
        {t('UNKNOWN_FORMAT')}
      </Typography>
      <Typography variant="h6" component="h4" className={cx(c.cardTitle, c.error)} id={setId('download-only')}>
        {itIsBinary ? t('DOWNLOAD_ONLY') : t('NOT_SUPPORTED')}
      </Typography>
      {/* setId is not a real Button prop; passed through as-is from the original (a no-op DOM attribute). */}
      <Button color="yellow" className={c.pdfDownload} onClick={handleDownload} {...{ setId: (elementName: string) => setId(`download-${elementName}`) }}>
        <Icon>save_alt</Icon>
      </Button>
    </div>
  );
};

const styled = withStyles(styles)(UnknownFormat);
const translated = translate('ClaimList')(styled);

export default translated;
